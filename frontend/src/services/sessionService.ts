import { apiClient } from './api';
import type {
  CancelPolicy,
  CreateSessionPayload,
  SearchSessionsParams,
  SessionDetail,
  SessionSearchItem,
  SessionStatus,
} from '../types/session';

export interface HostedSession {
  id: string;
  title: string;
  court_name: string;
  address: string;
  court_number: string;
  start_time: string;
  end_time: string;
  price_per_slot: string;
  min_players: number;
  max_players: number;
  booked_slots: number;
  cancel_policy: CancelPolicy;
  status: SessionStatus;
  confirmed_bookings_count: number;
  checked_in_bookings_count: number;
}

export const sessionService = {
  async searchSessions(params: SearchSessionsParams): Promise<{ items: SessionSearchItem[] }> {
    const response = await apiClient.get<{ items: SessionSearchItem[] }>('/sessions/search', {
      params,
    });
    return response.data;
  },

  async getSessionDetail(id: string): Promise<SessionDetail> {
    const response = await apiClient.get<SessionDetail>(`/sessions/${id}`);
    return response.data;
  },

  async createSession(payload: CreateSessionPayload): Promise<SessionDetail> {
    const response = await apiClient.post<SessionDetail>('/sessions', payload);
    return response.data;
  },

  async getMyHostedSessions(): Promise<HostedSession[]> {
    const response = await apiClient.get<HostedSession[]>('/sessions/my-hosted');
    return response.data;
  },

  async cancelSession(id: string): Promise<{ message: string; refunded_bookings: number }> {
    const response = await apiClient.post<{ message: string; refunded_bookings: number }>(
      `/sessions/${id}/cancel`,
    );
    return response.data;
  },
};
