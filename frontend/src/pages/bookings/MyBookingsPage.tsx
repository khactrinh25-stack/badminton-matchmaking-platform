import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ArrowLeft, Clock, MapPin, QrCode } from 'lucide-react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { extractApiErrorMessage } from '../../services/api';
import { bookingService, type BookingStatus, type MyBooking } from '../../services/bookingService';

const STATUS_LABEL: Record<BookingStatus, string> = {
  PENDING_PAYMENT: 'Chờ thanh toán',
  EXPIRED: 'Đã hết hạn',
  CONFIRMED: 'Đã xác nhận',
  CANCELLED_BY_GUEST: 'Đã hủy',
  CANCELLED_BY_HOST: 'Host đã hủy',
  CHECKED_IN: 'Đã điểm danh',
  DISPUTED: 'Đang phân xử',
  SETTLED: 'Đã quyết toán',
};

const HIDDEN_QR_STATUSES: BookingStatus[] = [
  'EXPIRED',
  'CANCELLED_BY_GUEST',
  'CANCELLED_BY_HOST',
];

export function MyBookingsPage() {
  const queryClient = useQueryClient();

  const { data: bookings, isLoading, isError, error } = useQuery({
    queryKey: ['bookings', 'my-bookings'],
    queryFn: bookingService.getMyBookings,
    refetchInterval: (query) =>
      query.state.data?.some((booking) => booking.status === 'PENDING_PAYMENT')
        ? 10000
        : false,
  });

  const mockPayMutation = useMutation({
    mutationFn: (bookingId: string) => bookingService.mockPay(bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', 'my-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <Link
          to="/sessions"
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Tìm sân
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Đơn đặt chỗ của tôi</h1>
      </div>

      {mockPayMutation.isError && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{extractApiErrorMessage(mockPayMutation.error)}</span>
        </div>
      )}

      {isLoading && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Đang tải danh sách đơn...
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {extractApiErrorMessage(error, 'Không thể tải danh sách đơn đặt chỗ.')}
        </div>
      )}

      {!isLoading && !isError && bookings?.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-600">Bạn chưa có đơn đặt chỗ nào.</p>
          <Link
            to="/sessions"
            className="mt-3 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Tìm buổi đánh ngay
          </Link>
        </div>
      )}

      <div className="space-y-4">
        {bookings?.map((booking: MyBooking) => {
          const isPending = booking.status === 'PENDING_PAYMENT';
          const showQr = !HIDDEN_QR_STATUSES.includes(booking.status);

          return (
            <div
              key={booking.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-900">
                    {booking.session.title}
                  </h2>
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-600">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    {booking.session.court_name} — {booking.session.address}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    isPending
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {STATUS_LABEL[booking.status]}
                </span>
              </div>

              <div className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
                <p>
                  <span className="text-slate-500">Số vị trí:</span>{' '}
                  <span className="font-semibold">{booking.slots_count}</span>
                </p>
                <p>
                  <span className="text-slate-500">Thành tiền:</span>{' '}
                  <span className="font-semibold text-emerald-700">
                    {Number(booking.total_amount).toLocaleString('vi-VN')}đ
                  </span>
                </p>
                <p>
                  <span className="text-slate-500">Bắt đầu:</span>{' '}
                  {new Date(booking.session.start_time).toLocaleString('vi-VN')}
                </p>
                <p>
                  <span className="text-slate-500">Chủ kèo:</span>{' '}
                  {booking.session.host.full_name}
                </p>
              </div>

              {isPending && booking.expires_at && (
                <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  Chỗ của bạn được giữ đến{' '}
                  {new Date(booking.expires_at).toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                  .
                </p>
              )}

              <div className="mt-4 flex flex-col items-center gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-start">
                {showQr && (
                  <div className="flex flex-col items-center gap-1">
                    <QrCode className="h-4 w-4 text-slate-400" />
                    <QRCodeSVG value={booking.qr_payload ?? booking.id} size={144} />
                  </div>
                )}
                <div className="flex-1 space-y-2 text-xs text-slate-600">
                  {isPending && (
                    <>
                      <p>
                        Quét mã QR hoặc xác nhận tại đây để khóa chỗ. Đây là chế độ demo,
                        không cần chuyển tiền thật.
                      </p>
                      <button
                        type="button"
                        disabled={
                          mockPayMutation.isPending &&
                          mockPayMutation.variables === booking.id
                        }
                        onClick={() => mockPayMutation.mutate(booking.id)}
                        className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 sm:w-auto"
                      >
                        {mockPayMutation.isPending &&
                        mockPayMutation.variables === booking.id
                          ? 'Đang xác nhận...'
                          : 'Giả lập thanh toán'}
                      </button>
                    </>
                  )}
                  {booking.status === 'CONFIRMED' && (
                    <p className="rounded-lg bg-emerald-50 p-2.5 text-emerald-800">
                      Thanh toán đã được xác nhận. Xuất trình mã QR này khi đến sân.
                    </p>
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
