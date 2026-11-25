import { apiClient } from './api';
import type {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  UpdateProfilePayload,
  UserProfile,
} from '../types/auth';

export const authService = {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', payload);
    return data;
  },

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>('/auth/register', payload);
    return data;
  },
};

export const userService = {
  async getMe(): Promise<UserProfile> {
    const { data } = await apiClient.get<UserProfile>('/users/me');
    return data;
  },

  async updateMe(payload: UpdateProfilePayload): Promise<UserProfile> {
    const { data } = await apiClient.patch<UserProfile>('/users/me', payload);
    return data;
  },
};
