import type { SessionStatus } from '../types/session';

export interface CancelEligibilitySession {
  status: SessionStatus;
  start_time: string;
  booked_slots: number;
  min_players: number;
}

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const SAFETY_BUFFER_MS = 5 * 60 * 1000;

export function getCancelBlockReason(
  session: CancelEligibilitySession,
  now: number = Date.now(),
): string | null {
  if (session.status !== 'OPEN') {
    return 'Chỉ có thể hủy buổi đánh đang mở đăng ký.';
  }

  if (new Date(session.start_time).getTime() - now < TWO_HOURS_MS + SAFETY_BUFFER_MS) {
    return 'Chỉ có thể hủy trước giờ bắt đầu ít nhất 2 tiếng.';
  }

  if (session.booked_slots >= session.min_players) {
    return `Đã đủ ${session.min_players} người tối thiểu nên không thể hủy.`;
  }

  return null;
}
