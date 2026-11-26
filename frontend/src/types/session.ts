export type CancelPolicy = 'FLEXIBLE_6H' | 'MODERATE_12H' | 'STRICT_24H';
export type SessionStatus = 'OPEN' | 'FULL' | 'CANCELLED' | 'COMPLETED';

export interface SessionHostSummary {
  id: string;
  full_name: string;
  skill_level: number;
  phone_number?: string;
}

export interface SessionSearchItem {
  id: string;
  title: string;
  court_name: string;
  address: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  start_time: string;
  end_time: string;
  price_per_slot: string;
  min_skill_level: number;
  max_skill_level: number;
  booked_slots: number;
  max_players: number;
  cancel_policy: CancelPolicy;
  host: SessionHostSummary;
}

export interface SessionParticipant {
  booking_id: string;
  guest_id: string;
  full_name: string;
  phone_number: string;
  skill_level: number;
  slots_count: number;
  status: string;
}

export interface SessionDetail {
  id: string;
  title: string;
  court_name: string;
  address: string;
  court_number: string;
  latitude: number;
  longitude: number;
  start_time: string;
  end_time: string;
  price_per_slot: string;
  min_skill_level: number;
  max_skill_level: number;
  min_players: number;
  max_players: number;
  booked_slots: number;
  cancel_policy: CancelPolicy;
  status: SessionStatus;
  note: string | null;
  is_phone_unlocked: boolean;
  host: {
    id: string;
    full_name: string;
    phone_number: string;
    skill_level: number;
  };
  participants: SessionParticipant[];
}

export interface CreateSessionPayload {
  title: string;
  court_name: string;
  address: string;
  court_number: string;
  latitude: number;
  longitude: number;
  start_time: string;
  end_time: string;
  price_per_slot: number;
  min_skill_level: number;
  max_skill_level: number;
  min_players: number;
  max_players: number;
  cancel_policy: CancelPolicy;
  note?: string;
}

export interface SearchSessionsParams {
  lat: number;
  lng: number;
  radius_km?: number;
  skill_level?: number;
  date?: string;
}

export const CANCEL_POLICY_META: Record<
  CancelPolicy,
  { label: string; description: string; minHours: number }
> = {
  FLEXIBLE_6H: {
    label: 'Linh hoạt (6h)',
    description: 'Hoàn 100% trước 6h, hoàn 50% trước 2h',
    minHours: 6,
  },
  MODERATE_12H: {
    label: 'Tiêu chuẩn (12h)',
    description: 'Hoàn 100% trước 12h, hoàn 50% trước 4h',
    minHours: 12,
  },
  STRICT_24H: {
    label: 'Nghiêm ngặt (24h)',
    description: 'Hoàn 100% trước 24h, hoàn 50% trước 12h',
    minHours: 24,
  },
};
