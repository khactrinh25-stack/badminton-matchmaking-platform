export type UserRole = 'USER' | 'ADMIN';

export interface UserProfile {
  id: string;
  phone_number: string;
  full_name: string;
  role: UserRole | string;
  skill_level: number;
  available_balance: string;
  violation_count: number;
  is_locked: boolean;
  locked_until: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AuthResponse {
  access_token: string;
  user: UserProfile;
}

export interface LoginPayload {
  phone_number: string;
  password: string;
}

export interface RegisterPayload {
  phone_number: string;
  password: string;
  full_name: string;
  skill_level?: number;
}

export interface UpdateProfilePayload {
  full_name?: string;
  skill_level?: number;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_name?: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  errorCode?: string;
  message: string | string[];
  timestamp?: string;
}
