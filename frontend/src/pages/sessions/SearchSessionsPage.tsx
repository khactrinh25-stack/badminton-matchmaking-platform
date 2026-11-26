import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Clock, Compass, MapPin, PlusCircle, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { CustomMapView, type MapMarker } from '../../components/map/CustomMapView';
import { SKILL_LEVEL_OPTIONS, getSkillLevelLabel } from '../../constants/skillLevels';
import { sessionService } from '../../services/sessionService';
import { CANCEL_POLICY_META } from '../../types/session';

// Default center: Ho Chi Minh City center
const DEFAULT_CENTER = { lat: 10.7769, lng: 106.7009 };

export function SearchSessionsPage() {
  const navigate = useNavigate();
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [radiusKm, setRadiusKm] = useState<number>(10);
  const [skillLevel, setSkillLevel] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [gpsError, setGpsError] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['sessions', 'search', center.lat, center.lng, radiusKm, skillLevel, date],
    queryFn: () =>
      sessionService.searchSessions({
        lat: center.lat,
        lng: center.lng,
        radius_km: radiusKm,
        skill_level: skillLevel ? Number(skillLevel) : undefined,
        date: date || undefined,
      }),
    refetchInterval: 30000,
  });

  const sessions = data?.items ?? [];

  const markers: MapMarker[] = sessions.map((session) => ({
    id: session.id,
    lat: session.latitude,
    lng: session.longitude,
    title: session.title,
    subtitle: `${session.court_name} • ${Number(session.price_per_slot).toLocaleString('vi-VN')}đ • ${session.booked_slots}/${session.max_players} chỗ`,
    onClick: () => navigate(`/sessions/${session.id}`),
  }));

  const handleUseMyGps = () => {
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError('Trình duyệt không hỗ trợ định vị GPS.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCenter({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => {
        setGpsError('Không thể lấy vị trí GPS. Vui lòng cấp quyền vị trí hoặc tìm địa chỉ trên bản đồ.');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tìm buổi đánh cầu lông</h1>
          <p className="text-sm text-slate-600">
            Lọc kèo vãng lai theo bán kính GPS và trình độ gần bạn
          </p>
        </div>
        <Link
          to="/sessions/create"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
        >
          <PlusCircle className="h-4 w-4" />
          Tạo buổi đánh mới
        </Link>
      </div>

      {/* Bộ lọc */}
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Bán kính</label>
          <select
            value={radiusKm}
            onChange={(e) => setRadiusKm(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
          >
            <option value={2}>Trong 2 km</option>
            <option value={5}>Trong 5 km</option>
            <option value={10}>Trong 10 km</option>
            <option value={20}>Trong 20 km</option>
            <option value={50}>Trong 50 km</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Trình độ của bạn</label>
          <select
            value={skillLevel}
            onChange={(e) => setSkillLevel(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
          >
            <option value="">Tất cả trình độ</option>
            {SKILL_LEVEL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.value.toFixed(1)} - {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Ngày đánh</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={handleUseMyGps}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-600 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
          >
            <Compass className="h-4 w-4" />
            Vị trí GPS của tôi
          </button>
        </div>
      </div>

      {gpsError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          {gpsError}
        </div>
      )}

      {/* Bản đồ + Danh sách */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <CustomMapView
              center={center}
              markers={markers}
              radiusKm={radiusKm}
              height="440px"
              searchable
              onLocationSelect={(loc) => setCenter({ lat: loc.lat, lng: loc.lng })}
            />
            <p className="mt-2 text-xs text-slate-500">
              Nhấp vào bản đồ hoặc tìm địa chỉ để đổi tâm tìm kiếm ({center.lat.toFixed(4)},{' '}
              {center.lng.toFixed(4)}).
            </p>
          </div>
        </div>

        <div className="space-y-3 lg:col-span-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              Kết quả ({sessions.length} buổi đánh)
            </h2>
          </div>

          {isLoading && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
              Đang tìm kiếm buổi đánh gần bạn...
            </div>
          )}

          {isError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              Lỗi tải danh sách: {error instanceof Error ? error.message : 'Vui lòng thử lại.'}
            </div>
          )}

          {!isLoading && !isError && sessions.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
              Không tìm thấy buổi đánh nào trong bán kính {radiusKm} km. Hãy thử tăng bán kính hoặc
              chọn khu vực khác.
            </div>
          )}

          <div className="space-y-3">
            {sessions.map((session) => {
              const start = new Date(session.start_time);
              const end = new Date(session.end_time);
              const remainingSlots = session.max_players - session.booked_slots;

              return (
                <Link
                  key={session.id}
                  to={`/sessions/${session.id}`}
                  className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-400 hover:shadow"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-slate-900 line-clamp-1">{session.title}</h3>
                    <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                      {session.distance_km} km
                    </span>
                  </div>

                  <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span className="line-clamp-1">
                      {session.court_name} — {session.address}
                    </span>
                  </p>

                  <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      {start.toLocaleDateString('vi-VN')}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      {start.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} -{' '}
                      {end.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-slate-400" />
                      Còn {remainingSlots}/{session.max_players} chỗ
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                        Trình {getSkillLevelLabel(session.min_skill_level)} -{' '}
                        {getSkillLevelLabel(session.max_skill_level)}
                      </span>
                      <span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                        {CANCEL_POLICY_META[session.cancel_policy].label}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-emerald-700">
                      {Number(session.price_per_slot).toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
