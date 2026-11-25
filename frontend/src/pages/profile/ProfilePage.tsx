import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  AlertTriangle,
  Award,
  Building2,
  CheckCircle2,
  CreditCard,
  Loader2,
  LogOut,
  Phone,
  Save,
  ShieldAlert,
  ShieldCheck,
  User,
  Wallet,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getSkillLevelLabel, SKILL_LEVEL_OPTIONS } from '../../constants/skillLevels';
import { extractApiErrorMessage } from '../../services/api';
import { userService } from '../../services/authService';
import { useAuthStore } from '../../stores/authStore';
import type { UpdateProfilePayload, UserProfile } from '../../types/auth';

function formatCurrencyVnd(amount: string | number): string {
  const numeric = typeof amount === 'string' ? Number(amount) : amount;
  if (Number.isNaN(numeric)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(numeric);
}

function formatDateTime(isoDate: string | null): string {
  if (!isoDate) return '';
  return new Date(isoDate).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: storedUser, setUser, logout } = useAuthStore();

  const {
    data: profile,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['user', 'me'],
    queryFn: async () => {
      const data = await userService.getMe();
      setUser(data);
      return data;
    },
  });

  const currentUser = profile ?? storedUser;
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const updateMutation = useMutation({
    mutationFn: userService.updateMe,
    onSuccess: (updated) => {
      setUser(updated);
      queryClient.setQueryData(['user', 'me'], updated);
      setSuccessMessage('Cập nhật hồ sơ thành công!');
    },
  });

  const handleLogout = () => {
    logout();
    queryClient.clear();
    navigate('/login', { replace: true });
  };

  const handleProfileSubmit = (payload: UpdateProfilePayload) => {
    setSuccessMessage(null);
    updateMutation.mutate(payload);
  };

  const formSyncKey = currentUser
    ? [
        currentUser.id,
        currentUser.full_name,
        currentUser.skill_level,
        currentUser.bank_name ?? '',
        currentUser.bank_account_number ?? '',
        currentUser.bank_account_name ?? '',
      ].join('|')
    : 'empty';

  if (isLoading && !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-2 text-slate-600">
          <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
          <span className="text-sm font-medium">Đang tải hồ sơ cá nhân...</span>
        </div>
      </div>
    );
  }

  const isAdmin = currentUser?.role === 'ADMIN';
  const violationCount = currentUser?.violation_count ?? 0;
  const isLocked = currentUser?.is_locked ?? false;

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      {/* Top App Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
              CL
            </div>
            <span className="font-semibold text-slate-900 text-sm sm:text-base">
              Hồ sơ cá nhân
            </span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-5 space-y-4">
        {isError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200 p-3.5 text-sm text-red-700"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{extractApiErrorMessage(error, 'Không thể tải dữ liệu hồ sơ mới nhất.')}</span>
          </div>
        )}

        {/* Account Lock Warning Banner */}
        {isLocked && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">
              <p className="font-semibold">Tài khoản đang bị tạm khóa quyền đặt & tạo sân</p>
              <p className="mt-0.5 text-red-700">
                Bạn đã tích lũy đủ {violationCount} lần vi phạm quy định.
                {currentUser?.locked_until &&
                  ` Tài khoản sẽ được mở khóa vào ${formatDateTime(currentUser.locked_until)}.`}
              </p>
            </div>
          </div>
        )}

        {/* User Overview Card */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg shrink-0">
                {currentUser?.full_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg font-bold text-slate-900">
                    {currentUser?.full_name || 'Người chơi'}
                  </h1>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      isAdmin
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {isAdmin ? 'Quản trị viên' : 'Người chơi'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-0.5">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{currentUser?.phone_number}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5 pt-4 border-t border-slate-100">
            {/* Available Balance */}
            <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase tracking-wide">
                <Wallet className="w-4 h-4 text-emerald-600" />
                <span>Số dư khả dụng</span>
              </div>
              <p className="mt-1.5 text-lg font-bold text-slate-900">
                {formatCurrencyVnd(currentUser?.available_balance ?? '0')}
              </p>
            </div>

            {/* Violation Count / Strikes */}
            <div
              className={`rounded-xl border p-3.5 ${
                isLocked || violationCount >= 2
                  ? 'bg-red-50 border-red-200'
                  : violationCount === 1
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-emerald-50/60 border-emerald-200/80'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-medium text-slate-600 uppercase tracking-wide">
                {violationCount === 0 ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertTriangle
                    className={`w-4 h-4 ${
                      violationCount >= 2 ? 'text-red-600' : 'text-amber-600'
                    }`}
                  />
                )}
                <span>Số lần vi phạm (Gậy phạt)</span>
              </div>
              <div className="mt-1.5 flex items-baseline justify-between">
                <p
                  className={`text-lg font-bold ${
                    violationCount >= 2
                      ? 'text-red-700'
                      : violationCount === 1
                        ? 'text-amber-700'
                        : 'text-emerald-700'
                  }`}
                >
                  {violationCount} / 2 gậy
                </p>
                <span className="text-xs text-slate-600">
                  {violationCount === 0
                    ? 'Uy tín tốt'
                    : violationCount === 1
                      ? 'Cảnh báo mức 1'
                      : 'Đạt ngưỡng khóa 14 ngày'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <Award className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Trình độ hiện tại:{' '}
              <strong className="text-slate-800">
                {getSkillLevelLabel(currentUser?.skill_level ?? 2.5)}
              </strong>
            </span>
          </div>
        </section>

        {/* Edit Profile Form */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 mb-1">
            Cập nhật trình độ & Tài khoản ngân hàng
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Thông tin ngân hàng thụ hưởng được dùng khi bạn gửi yêu cầu rút tiền từ ví.
          </p>

          {successMessage && (
            <div
              role="status"
              className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {updateMutation.isError && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                {extractApiErrorMessage(updateMutation.error, 'Cập nhật hồ sơ thất bại.')}
              </span>
            </div>
          )}

          {isAdmin && (
            <div className="mb-4 rounded-xl bg-slate-100 border border-slate-200 p-3 text-xs text-slate-600">
              Tài khoản Quản trị viên chỉ xem thông tin hồ sơ, không sử dụng biểu mẫu cập nhật người chơi.
            </div>
          )}

          <ProfileEditForm
            key={formSyncKey}
            currentUser={currentUser}
            isAdmin={isAdmin}
            isPending={updateMutation.isPending}
            onSubmit={handleProfileSubmit}
          />
        </section>
      </main>
    </div>
  );
}

interface ProfileEditFormProps {
  currentUser: UserProfile | null;
  isAdmin: boolean;
  isPending: boolean;
  onSubmit: (payload: UpdateProfilePayload) => void;
}

function ProfileEditForm({
  currentUser,
  isAdmin,
  isPending,
  onSubmit,
}: ProfileEditFormProps) {
  const [fullName, setFullName] = useState(currentUser?.full_name ?? '');
  const [skillLevel, setSkillLevel] = useState<number>(currentUser?.skill_level ?? 2.5);
  const [bankName, setBankName] = useState(currentUser?.bank_name ?? '');
  const [bankAccountNumber, setBankAccountNumber] = useState(
    currentUser?.bank_account_number ?? '',
  );
  const [bankAccountName, setBankAccountName] = useState(currentUser?.bank_account_name ?? '');

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit({
      full_name: fullName.trim() || undefined,
      skill_level: skillLevel,
      bank_name: bankName.trim() || undefined,
      bank_account_number: bankAccountNumber.trim() || undefined,
      bank_account_name: bankAccountName.trim().toUpperCase() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="profile_name" className="block text-sm font-medium text-slate-700 mb-1.5">
          Họ và tên
        </label>
        <div className="relative">
          <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="profile_name"
            type="text"
            maxLength={100}
            disabled={isAdmin}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm disabled:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>
      </div>

      <div>
        <label htmlFor="profile_skill" className="block text-sm font-medium text-slate-700 mb-1.5">
          Trình độ cầu lông
        </label>
        <div className="relative">
          <Award className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            id="profile_skill"
            disabled={isAdmin}
            value={skillLevel}
            onChange={(e) => setSkillLevel(Number(e.target.value))}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm bg-white disabled:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            {SKILL_LEVEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {SKILL_LEVEL_OPTIONS.find((o) => o.value === skillLevel)?.description}
        </p>
      </div>

      <div className="pt-2 border-t border-slate-100 space-y-4">
        <h3 className="text-sm font-semibold text-slate-800">
          Thông tin ngân hàng thụ hưởng
        </h3>

        <div>
          <label htmlFor="bank_name" className="block text-sm font-medium text-slate-700 mb-1.5">
            Tên ngân hàng
          </label>
          <div className="relative">
            <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="bank_name"
              type="text"
              maxLength={100}
              disabled={isAdmin}
              placeholder="Ví dụ: Vietcombank, MB Bank, Techcombank..."
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm disabled:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="bank_account_number"
            className="block text-sm font-medium text-slate-700 mb-1.5"
          >
            Số tài khoản ngân hàng
          </label>
          <div className="relative">
            <CreditCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="bank_account_number"
              type="text"
              inputMode="numeric"
              maxLength={50}
              disabled={isAdmin}
              placeholder="0071000123456"
              value={bankAccountNumber}
              onChange={(e) => setBankAccountNumber(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm disabled:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="bank_account_name"
            className="block text-sm font-medium text-slate-700 mb-1.5"
          >
            Tên chủ tài khoản (viết hoa không dấu)
          </label>
          <input
            id="bank_account_name"
            type="text"
            maxLength={100}
            disabled={isAdmin}
            placeholder="NGUYEN VAN A"
            value={bankAccountName}
            onChange={(e) => setBankAccountName(e.target.value.toUpperCase())}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm uppercase disabled:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>
      </div>

      {!isAdmin && (
        <button
          type="submit"
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold text-sm transition-colors shadow-sm"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang lưu thay đổi...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Lưu thông tin hồ sơ
            </>
          )}
        </button>
      )}
    </form>
  );
}
