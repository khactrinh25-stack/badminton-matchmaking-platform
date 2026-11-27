import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { extractApiErrorMessage } from '../../services/api';
import {
  sessionService,
  type HostedSession,
} from '../../services/sessionService';
import { CANCEL_POLICY_META } from '../../types/session';
import { getCancelBlockReason } from '../../utils/cancelSessionEligibility';

const STATUS_LABEL: Record<HostedSession['status'], string> = {
  OPEN: 'Đang mở đăng ký',
  FULL: 'Đã đủ người',
  CANCELLED: 'Đã hủy',
  COMPLETED: 'Đã hoàn tất',
};

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatCurrencyVnd(value: string): string {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(numeric);
}

export function HostManageSessionPage() {
  const queryClient = useQueryClient();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const { data: sessions, isLoading, isError, error } = useQuery({
    queryKey: ['sessions', 'my-hosted'],
    queryFn: sessionService.getMyHostedSessions,
    refetchInterval: 30000,
  });

  const cancelMutation = useMutation({
    mutationFn: (sessionId: string) => sessionService.cancelSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', 'my-hosted'] });
      queryClient.invalidateQueries({ queryKey: ['sessions', 'search'] });
      queryClient.invalidateQueries({ queryKey: ['sessions', 'detail'] });
      queryClient.invalidateQueries({ queryKey: ['bookings', 'my-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
    },
  });

  const handleCancel = (session: HostedSession) => {
    const confirmed = window.confirm(
      `Hủy buổi đánh "${session.title}"? Tất cả người chơi đã thanh toán sẽ được hoàn 100% số tiền đã đóng.`,
    );
    if (confirmed) {
      cancelMutation.mutate(session.id);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Buổi đánh của tôi</h1>
          <p className="mt-1 text-sm text-slate-500">
            Theo dõi người tham gia và hủy buổi đánh khi chưa đủ người.
          </p>
        </div>
        <Link
          to="/sessions/create"
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Tạo buổi đánh mới
        </Link>
      </div>

      {cancelMutation.isSuccess && cancelMutation.data && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {cancelMutation.data.message} Đã hoàn tiền cho{' '}
            {cancelMutation.data.refunded_bookings} đơn đặt chỗ.
          </span>
        </div>
      )}

      {cancelMutation.isError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {extractApiErrorMessage(
              cancelMutation.error,
              'Không thể hủy buổi đánh. Vui lòng thử lại.',
            )}
          </span>
        </div>
      )}

      {isLoading && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Đang tải danh sách buổi đánh...
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {extractApiErrorMessage(error, 'Không thể tải danh sách buổi đánh.')}
        </div>
      )}

      {!isLoading && !isError && sessions?.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Bạn chưa tổ chức buổi đánh nào.
        </div>
      )}

      <div className="space-y-4">
        {sessions?.map((session) => {
          const blockReason = getCancelBlockReason(session, now);
          const isPending = cancelMutation.isPending && cancelMutation.variables === session.id;
          return (
            <div
              key={session.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <p className="text-base font-semibold text-slate-900">{session.title}</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDateTime(session.start_time)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDateTime(session.end_time)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {session.court_name}
                    </span>
                  </div>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    session.status === 'OPEN'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {STATUS_LABEL[session.status]}
                </span>
              </div>

              <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs text-slate-500">Đã đặt / Tối thiểu</p>
                  <p className="mt-0.5 inline-flex items-center gap-1 font-semibold text-slate-900">
                    <Users className="h-4 w-4 text-slate-400" />
                    {session.booked_slots} / {session.min_players} (tối đa {session.max_players})
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Đơn đã xác nhận</p>
                  <p className="mt-0.5 font-semibold text-slate-900">
                    {session.confirmed_bookings_count}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Đã điểm danh</p>
                  <p className="mt-0.5 font-semibold text-slate-900">
                    {session.checked_in_bookings_count}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Giá mỗi vị trí</p>
                  <p className="mt-0.5 font-semibold text-slate-900">
                    {formatCurrencyVnd(session.price_per_slot)}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <p className="text-xs text-slate-500">
                  Chính sách hủy: {CANCEL_POLICY_META[session.cancel_policy].label}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    to={`/sessions/${session.id}`}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Xem chi tiết
                  </Link>
                  {blockReason === null ? (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleCancel(session)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                    >
                      {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                      {isPending ? 'Đang hủy...' : 'Hủy buổi đánh'}
                    </button>
                  ) : (
                    <span className="text-xs text-slate-500">{blockReason}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
