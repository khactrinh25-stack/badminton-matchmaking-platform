import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AlertCircle, ArrowLeft, Loader2, Lock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { CustomMapView } from '../../components/map/CustomMapView';
import { SKILL_LEVEL_OPTIONS } from '../../constants/skillLevels';
import { extractApiErrorMessage } from '../../services/api';
import { sessionService } from '../../services/sessionService';
import { CANCEL_POLICY_META, type CancelPolicy } from '../../types/session';

function toLocalDateTimeInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

const DURATION_OPTIONS = [
  { value: 1, label: '1 giờ' },
  { value: 1.5, label: '1.5 giờ' },
  { value: 2, label: '2 giờ' },
  { value: 2.5, label: '2.5 giờ' },
  { value: 3, label: '3 giờ' },
  { value: 4, label: '4 giờ' },
];

export function CreateSessionPage() {
  const navigate = useNavigate();

  const defaultStart = useMemo(() => {
    const d = new Date(Date.now() + 8 * 60 * 60 * 1000);
    d.setMinutes(0, 0, 0);
    return d;
  }, []);

  const [title, setTitle] = useState('');
  const [courtName, setCourtName] = useState('');
  const [address, setAddress] = useState('');
  const [courtNumber, setCourtNumber] = useState('');
  const [coords, setCoords] = useState({ lat: 10.7769, lng: 106.7009 });
  const [startTime, setStartTime] = useState(toLocalDateTimeInput(defaultStart));
  const [durationHours, setDurationHours] = useState<number>(2);
  const [pricePerSlot, setPricePerSlot] = useState(70000);
  const [minSkillLevel, setMinSkillLevel] = useState(2.0);
  const [maxSkillLevel, setMaxSkillLevel] = useState(3.5);
  const [minPlayers, setMinPlayers] = useState(4);
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [cancelPolicy, setCancelPolicy] = useState<CancelPolicy>('FLEXIBLE_6H');
  const [note, setNote] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const computedEndTime = useMemo(() => {
    const start = new Date(startTime);
    if (Number.isNaN(start.getTime())) return null;
    return new Date(start.getTime() + durationHours * 60 * 60 * 1000);
  }, [startTime, durationHours]);

  // RULE-05: Tính số giờ từ hiện tại tới start_time để khóa gói hủy không hợp lệ
  const hoursUntilStart = useMemo(() => {
    const parsed = new Date(startTime);
    if (Number.isNaN(parsed.getTime())) return 0;
    return (parsed.getTime() - Date.now()) / (1000 * 60 * 60);
  }, [startTime]);

  const policyAvailability: Record<CancelPolicy, boolean> = useMemo(
    () => ({
      FLEXIBLE_6H: hoursUntilStart >= CANCEL_POLICY_META.FLEXIBLE_6H.minHours,
      MODERATE_12H: hoursUntilStart >= CANCEL_POLICY_META.MODERATE_12H.minHours,
      STRICT_24H: hoursUntilStart >= CANCEL_POLICY_META.STRICT_24H.minHours,
    }),
    [hoursUntilStart],
  );

  useEffect(() => {
    if (!policyAvailability[cancelPolicy]) {
      const firstValid = (Object.keys(policyAvailability) as CancelPolicy[]).find(
        (key) => policyAvailability[key],
      );
      if (firstValid) {
        setCancelPolicy(firstValid);
      }
    }
  }, [cancelPolicy, policyAvailability]);

  const createMutation = useMutation({
    mutationFn: sessionService.createSession,
    onSuccess: (created) => {
      navigate(`/sessions/${created.id}`, { replace: true });
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!title.trim() || !courtName.trim() || !address.trim() || !courtNumber.trim()) {
      setValidationError('Vui lòng điền đầy đủ tiêu đề, tên sân, địa chỉ và số sân.');
      return;
    }

    const start = new Date(startTime);
    const end = computedEndTime;
    if (start <= new Date()) {
      setValidationError('Thời gian bắt đầu phải lớn hơn thời điểm hiện tại.');
      return;
    }
    if (!end || end <= start) {
      setValidationError('Thời lượng buổi đánh không hợp lệ.');
      return;
    }
    if (!policyAvailability[cancelPolicy]) {
      setValidationError(
        'Thời gian bắt đầu quá gần, không đủ điều kiện áp dụng gói hủy tối thiểu (6 giờ).',
      );
      return;
    }
    if (minSkillLevel > maxSkillLevel) {
      setValidationError('Trình độ tối thiểu không được lớn hơn trình độ tối đa.');
      return;
    }
    if (minPlayers > maxPlayers) {
      setValidationError('Số người tối thiểu không được lớn hơn số người tối đa.');
      return;
    }

    createMutation.mutate({
      title: title.trim(),
      court_name: courtName.trim(),
      address: address.trim(),
      court_number: courtNumber.trim(),
      latitude: coords.lat,
      longitude: coords.lng,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      price_per_slot: Number(pricePerSlot),
      min_skill_level: Number(minSkillLevel),
      max_skill_level: Number(maxSkillLevel),
      min_players: Number(minPlayers),
      max_players: Number(maxPlayers),
      cancel_policy: cancelPolicy,
      note: note.trim() || undefined,
    });
  };

  const errorMessage =
    validationError ||
    (createMutation.isError
      ? extractApiErrorMessage(createMutation.error, 'Không thể tạo buổi đánh.')
      : null);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center gap-3">
        <Link
          to="/sessions"
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Tạo buổi đánh mới</h1>
      </div>

      {errorMessage && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Tiêu đề buổi đánh *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Giao lưu tối T5 - Sân Cầu lông Gia Định"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Tên cụm sân *</label>
            <input
              type="text"
              value={courtName}
              onChange={(e) => setCourtName(e.target.value)}
              placeholder="VD: Sân Cầu lông Gia Định"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Số sân con *</label>
            <input
              type="text"
              value={courtNumber}
              onChange={(e) => setCourtNumber(e.target.value)}
              placeholder="VD: Sân số 3 & 4"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">
            Vị trí sân trên bản đồ (Tìm kiếm hoặc nhấp chọn ghim) *
          </label>
          <CustomMapView
            center={coords}
            height="300px"
            searchable
            onLocationSelect={(loc) => {
              setCoords({ lat: loc.lat, lng: loc.lng });
              setAddress(loc.address);
            }}
          />
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Địa chỉ sân (tự động điền khi chọn trên bản đồ)"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            required
          />
          <p className="text-xs text-slate-500">
            Tọa độ đã chọn: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Ngày & giờ bắt đầu *
            </label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Thời lượng buổi đánh *
            </label>
            <select
              value={durationHours}
              onChange={(e) => setDurationHours(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            >
              {DURATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {computedEndTime && (
              <p className="mt-1 text-xs text-slate-500">
                Kết thúc lúc:{' '}
                {computedEndTime.toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                ({computedEndTime.toLocaleDateString('vi-VN')})
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Giá / vị trí (VNĐ) *</label>
            <input
              type="number"
              min={0}
              step={5000}
              value={pricePerSlot}
              onChange={(e) => setPricePerSlot(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Trình độ tối thiểu</label>
            <select
              value={minSkillLevel}
              onChange={(e) => setMinSkillLevel(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            >
              {SKILL_LEVEL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.value.toFixed(1)} - {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Trình độ tối đa</label>
            <select
              value={maxSkillLevel}
              onChange={(e) => setMaxSkillLevel(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            >
              {SKILL_LEVEL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.value.toFixed(1)} - {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Tối thiểu (người)</label>
            <input
              type="number"
              min={2}
              value={minPlayers}
              onChange={(e) => setMinPlayers(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Tối đa (người)</label>
            <input
              type="number"
              min={2}
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              required
            />
          </div>
        </div>

        {/* RULE-05: 3 gói hủy cố định */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">
            Chính sách hủy đặt chỗ *
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {(Object.keys(CANCEL_POLICY_META) as CancelPolicy[]).map((key) => {
              const meta = CANCEL_POLICY_META[key];
              const isAllowed = policyAvailability[key];
              const isSelected = cancelPolicy === key;

              return (
                <button
                  key={key}
                  type="button"
                  disabled={!isAllowed}
                  onClick={() => setCancelPolicy(key)}
                  className={`rounded-xl border p-3 text-left transition ${
                    !isAllowed
                      ? 'cursor-not-allowed border-slate-200 bg-slate-100 opacity-60'
                      : isSelected
                        ? 'border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900">{meta.label}</span>
                    {!isAllowed && <Lock className="h-3.5 w-3.5 text-slate-400" />}
                  </div>
                  <p className="mt-1 text-xs text-slate-600">{meta.description}</p>
                  {!isAllowed && (
                    <p className="mt-1 text-[11px] font-medium text-rose-600">
                      Cần tạo trước ít nhất {meta.minHours}h
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Ghi chú thêm</label>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="VD: Cầu Thành Công, bao nước suối, gửi xe 5k..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Link
            to="/sessions"
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Hủy
          </Link>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Đăng buổi đánh
          </button>
        </div>
      </form>
    </div>
  );
}
