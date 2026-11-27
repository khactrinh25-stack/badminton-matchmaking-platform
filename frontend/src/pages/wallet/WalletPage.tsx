import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { extractApiErrorMessage } from '../../services/api';
import { userService } from '../../services/authService';
import {
  walletService,
  type TransactionType,
  type WithdrawalStatus,
} from '../../services/walletService';

const MIN_WITHDRAWAL_AMOUNT = 50000;

const TRANSACTION_LABELS: Record<TransactionType, string> = {
  BOOKING_PAYMENT_GATEWAY: 'Thanh toán đặt chỗ',
  BOOKING_PAYMENT_WALLET: 'Thanh toán đặt chỗ bằng ví',
  BOOKING_REFUND: 'Hoàn tiền đặt chỗ',
  SESSION_PAYOUT: 'Giải ngân buổi đánh',
  WITHDRAWAL_DEDUCT: 'Rút tiền về ngân hàng',
  WITHDRAWAL_REFUND: 'Hoàn trả yêu cầu rút tiền',
};

const WITHDRAWAL_STATUS_LABELS: Record<WithdrawalStatus, string> = {
  PENDING: 'Đang chờ xử lý',
  COMPLETED: 'Đã hoàn tất',
  REJECTED: 'Đã từ chối',
};

const OUTFLOW_TYPES: TransactionType[] = [
  'BOOKING_PAYMENT_GATEWAY',
  'BOOKING_PAYMENT_WALLET',
  'WITHDRAWAL_DEDUCT',
];

function formatCurrencyVnd(amount: string | number): string {
  const numeric = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(numeric)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(numeric);
}

function formatDateTime(isoDate: string): string {
  return new Date(isoDate).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function WalletPage() {
  const queryClient = useQueryClient();
  const [amountInput, setAmountInput] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data: summary, isLoading, isError, error } = useQuery({
    queryKey: ['wallet', 'summary'],
    queryFn: walletService.getSummary,
  });

  const { data: profile } = useQuery({
    queryKey: ['user', 'me'],
    queryFn: userService.getMe,
  });

  const withdrawMutation = useMutation({
    mutationFn: walletService.createWithdrawal,
    onSuccess: (request) => {
      queryClient.invalidateQueries({ queryKey: ['wallet', 'summary'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['bookings', 'my-bookings'] });
      setAmountInput('');
      setValidationError(null);
      setSuccessMessage(
        `Đã gửi yêu cầu rút ${formatCurrencyVnd(request.amount)}. Yêu cầu đang chờ xử lý.`,
      );
    },
  });

  const availableBalance = Number(summary?.available_balance ?? 0);
  const hasBankInfo = Boolean(
    profile?.bank_name?.trim() &&
      profile?.bank_account_number?.trim() &&
      profile?.bank_account_name?.trim(),
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccessMessage(null);

    const amount = Number(amountInput);
    if (!Number.isFinite(amount) || amount < MIN_WITHDRAWAL_AMOUNT) {
      setValidationError(
        `Số tiền rút tối thiểu là ${formatCurrencyVnd(MIN_WITHDRAWAL_AMOUNT)}.`,
      );
      return;
    }
    if (amount > availableBalance) {
      setValidationError('Số dư khả dụng không đủ để thực hiện rút tiền.');
      return;
    }
    if (!hasBankInfo) {
      setValidationError(
        'Vui lòng cập nhật thông tin ngân hàng trong hồ sơ trước khi rút tiền.',
      );
      return;
    }

    setValidationError(null);
    withdrawMutation.mutate({ amount });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Ví của tôi</h1>
        <Link
          to="/profile"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          <Building2 className="h-4 w-4" />
          Hồ sơ thanh toán
        </Link>
      </div>

      {isError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {extractApiErrorMessage(error, 'Không thể tải thông tin ví lúc này.')}
          </span>
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            <Wallet className="h-4 w-4 text-emerald-600" />
            Số dư khả dụng
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {formatCurrencyVnd(summary?.available_balance ?? 0)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Dùng để đặt sân hoặc gửi yêu cầu rút tiền.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            <Clock className="h-4 w-4 text-amber-600" />
            Số dư tạm giữ
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {formatCurrencyVnd(summary?.escrow_held_amount ?? 0)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Tiền đang giữ cho các buổi đánh chưa quyết toán.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">
          Gửi yêu cầu rút tiền
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Số tiền tối thiểu {formatCurrencyVnd(MIN_WITHDRAWAL_AMOUNT)}. Tiền sẽ
          được chuyển đến tài khoản ngân hàng đã đăng ký trong hồ sơ.
        </p>

        {hasBankInfo ? (
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <p className="flex items-center gap-2 font-medium">
              <Building2 className="h-4 w-4 text-emerald-600" />
              {profile?.bank_name}
            </p>
            <p className="mt-1 pl-6 text-xs text-slate-600">
              {profile?.bank_account_number} — {profile?.bank_account_name}
            </p>
          </div>
        ) : (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Bạn chưa cập nhật đầy đủ tài khoản ngân hàng.{' '}
              <Link to="/profile" className="font-semibold underline">
                Cập nhật tại hồ sơ cá nhân
              </Link>{' '}
              để có thể rút tiền.
            </span>
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {validationError && (
          <div
            role="alert"
            className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {withdrawMutation.isError && (
          <div
            role="alert"
            className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {extractApiErrorMessage(
                withdrawMutation.error,
                'Không thể gửi yêu cầu rút tiền. Vui lòng thử lại.',
              )}
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <label
            htmlFor="withdrawal_amount"
            className="block text-sm font-medium text-slate-700"
          >
            Số tiền rút (VNĐ)
          </label>
          <div className="relative">
            <CreditCard className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="withdrawal_amount"
              type="number"
              min={MIN_WITHDRAWAL_AMOUNT}
              step={1000}
              inputMode="numeric"
              placeholder="200000"
              value={amountInput}
              onChange={(event) => setAmountInput(event.target.value)}
              disabled={withdrawMutation.isPending || !hasBankInfo}
              className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm disabled:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            disabled={withdrawMutation.isPending || !hasBankInfo}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-emerald-400"
          >
            {withdrawMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang gửi yêu cầu...
              </>
            ) : (
              'Gửi yêu cầu rút tiền'
            )}
          </button>
        </form>
      </section>

      {withdrawMutation.data && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
          <h2 className="text-base font-semibold text-slate-900">
            Yêu cầu rút tiền gần nhất
          </h2>
          <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
            <p>
              <span className="text-slate-500">Số tiền:</span>{' '}
              <strong>{formatCurrencyVnd(withdrawMutation.data.amount)}</strong>
            </p>
            <p>
              <span className="text-slate-500">Trạng thái:</span>{' '}
              <strong>
                {WITHDRAWAL_STATUS_LABELS[withdrawMutation.data.status] ??
                  'Đang xử lý'}
              </strong>
            </p>
            <p>
              <span className="text-slate-500">Ngân hàng:</span>{' '}
              {withdrawMutation.data.bank_name}
            </p>
            <p>
              <span className="text-slate-500">Tài khoản:</span>{' '}
              {withdrawMutation.data.bank_account_number}
            </p>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Gửi lúc {formatDateTime(withdrawMutation.data.created_at)}
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">
            Lịch sử biến động số dư
          </h2>
          <span className="text-xs text-slate-500">
            {summary?.transactions.length ?? 0} giao dịch
          </span>
        </div>

        {isLoading ? (
          <div className="mt-3 flex items-center gap-2 py-6 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
            Đang tải lịch sử ví...
          </div>
        ) : summary?.transactions.length ? (
          <ul className="mt-3 divide-y divide-slate-100">
            {summary.transactions.map((transaction) => {
              const isOutflow = OUTFLOW_TYPES.includes(transaction.type);
              return (
                <li
                  key={transaction.id}
                  className="flex items-start justify-between gap-3 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {TRANSACTION_LABELS[transaction.type] ?? 'Giao dịch ví'}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatDateTime(transaction.created_at)}
                      {transaction.description
                        ? ` — ${transaction.description}`
                        : ''}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Số dư sau: {formatCurrencyVnd(transaction.balance_after)}
                    </p>
                  </div>
                  <p
                    className={`shrink-0 text-sm font-semibold ${
                      isOutflow ? 'text-rose-600' : 'text-emerald-700'
                    }`}
                  >
                    {isOutflow ? '-' : '+'}
                    {formatCurrencyVnd(transaction.amount)}
                  </p>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 py-6 text-center text-sm text-slate-500">
            Chưa có giao dịch nào trên ví.
          </p>
        )}
      </section>
    </div>
  );
}
