import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Phone,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { CustomMapView } from '../../components/map/CustomMapView';
import { getSkillLevelLabel } from '../../constants/skillLevels';
import { extractApiErrorMessage } from '../../services/api';
import { sessionService } from '../../services/sessionService';
import { useAuthStore } from '../../stores/authStore';
import { CANCEL_POLICY_META } from '../../types/session';

export function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const { data: session, isLoading, isError, error } = useQuery({
    queryKey: ['sessions', 'detail', id],
    queryFn: () => sessionService.getSessionDetail(id!),
    enabled: Boolean(id),
    refetchInterval: 15000,
  });

  const cancelMutation = useMutation({
    mutationFn: () => sessionService.cancelSession(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', 'detail', id] });
      queryClient.invalidateQueries({ queryKey: ['sessions', 'search'] });
    },
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Đang tải thông tin buổi đánh...
      </div>
    );
  }

  if (isError || !session) {
    return (
      <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        <p>{extractApiErrorMessage(error, 'Không thể tải thông tin buổi đánh.')}</p>
        <Link to="/sessions" className="inline-block font-semibold underline">
          Quay lại danh sách tìm sân
        </Link>
      </div>
    );
  }

  const start = new Date(session.start_time);
  const end = new Date(session.end_time);
  const isHost = currentUser?.id === session.host.id;
  const remainingSlots = session.max_players - session.booked_slots;
  const policyMeta = CANCEL_POLICY_META[session.cancel_policy];

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-center justify-between">
        <Link
          to="/sessions"
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Danh sách sân
        </Link>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            session.status === 'OPEN'
              ? 'bg-emerald-100 text-emerald-800'
              : session.status === 'FULL'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-slate-200 text-slate-700'
          }`}
        >
          Trạng thái: {session.status}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-7">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h1 className="text-xl font-bold text-slate-900">{session.title}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
              <MapPin className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>
                {session.court_name} ({session.court_number}) — {session.address}
              </span>
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3.5 text-sm">
              <div className="flex items-center gap-2 text-slate-700">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span>{start.toLocaleDateString('vi-VN')}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Clock className="h-4 w-4 text-slate-400" />
                <span>
                  {start.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} -{' '}
                  {end.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Users className="h-4 w-4 text-slate-400" />
                <span>
                  Đã đặt {session.booked_slots}/{session.max_players} (Còn {remainingSlots} chỗ)
                </span>
              </div>
              <div className="font-bold text-emerald-700">
                {Number(session.price_per_slot).toLocaleString('vi-VN')}đ / vị trí
              </div>
            </div>

            <div className="mt-4 space-y-2 text-sm text-slate-700">
              <p>
                <span className="font-medium text-slate-900">Trình độ yêu cầu:</span>{' '}
                {getSkillLevelLabel(session.min_skill_level)} đến{' '}
                {getSkillLevelLabel(session.max_skill_level)}
              </p>
              <p>
                <span className="font-medium text-slate-900">Số người tối thiểu để mở sân:</span>{' '}
                {session.min_players} người
              </p>
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900">
                <p className="flex items-center gap-1.5 font-semibold">
                  <ShieldCheck className="h-4 w-4 text-blue-600" />
                  Chính sách hủy: {policyMeta.label}
                </p>
                <p className="mt-1">{policyMeta.description}</p>
              </div>
              {session.note && (
                <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
                  <span className="font-semibold">Ghi chú từ Host:</span> {session.note}
                </p>
              )}
            </div>
          </div>

          {/* Bản đồ vị trí sân */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-sm font-semibold text-slate-900">Vị trí sân trên bản đồ</h2>
            <CustomMapView
              center={{ lat: session.latitude, lng: session.longitude }}
              zoom={15}
              height="260px"
              searchable={false}
              markers={[
                {
                  id: session.id,
                  lat: session.latitude,
                  lng: session.longitude,
                  title: session.court_name,
                  subtitle: session.address,
                },
              ]}
            />
          </div>
        </div>

        {/* Cột phải: Thông tin Host, Người tham gia & Hành động */}
        <div className="space-y-5 lg:col-span-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Chủ kèo (Host)</h2>
            <div className="mt-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">{session.host.full_name}</p>
                <p className="text-xs text-slate-500">
                  Trình độ: {getSkillLevelLabel(session.host.skill_level)}
                </p>
              </div>
              {session.is_phone_unlocked || isHost ? (
                <a
                  href={`tel:${session.host.phone_number}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {session.host.phone_number}
                </a>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                  <Phone className="h-3.5 w-3.5" />
                  {session.host.phone_number}
                </span>
              )}
            </div>
            {!session.is_phone_unlocked && !isHost && (
              <p className="mt-2 text-[11px] text-slate-500">
                SĐT thật sẽ tự động mở khóa 30 phút trước giờ đánh cho người đã đặt chỗ.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">
              Danh sách người tham gia ({session.participants.length})
            </h2>
            {session.participants.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">Chưa có người đặt chỗ nào.</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {session.participants.map((p) => (
                  <li key={p.booking_id} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <p className="font-medium text-slate-800">{p.full_name}</p>
                      <p className="text-xs text-slate-500">
                        {getSkillLevelLabel(p.skill_level)} • {p.phone_number}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                      {p.slots_count} chỗ
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {isHost && session.status === 'OPEN' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
              <h2 className="text-base font-semibold text-slate-900">Quản lý buổi đánh (Host)</h2>
              {cancelMutation.isError && (
                <div className="flex items-start gap-2 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{extractApiErrorMessage(cancelMutation.error)}</span>
                </div>
              )}
              {cancelMutation.isSuccess && (
                <div className="rounded-lg bg-emerald-50 p-2.5 text-xs text-emerald-700">
                  {cancelMutation.data.message}
                </div>
              )}
              <button
                type="button"
                disabled={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate()}
                className="w-full rounded-xl border border-rose-300 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
              >
                {cancelMutation.isPending
                  ? 'Đang hủy buổi đánh...'
                  : 'Hủy buổi đánh (thiếu người tối thiểu)'}
              </button>
              <p className="text-[11px] text-slate-500">
                Chỉ hủy được trước giờ bắt đầu ít nhất 2 tiếng khi số chỗ đã đặt nhỏ hơn{' '}
                {session.min_players} người.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
