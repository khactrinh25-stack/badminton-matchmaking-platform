import { apiClient } from './api';
import type {
  CreateSessionPayload,
  SearchSessionsParams,
  SessionDetail,
  SessionSearchItem,
} from '../types/session';

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

  async cancelSession(id: string): Promise<{ message: string; refunded_bookings: number }> {
    const response = await apiClient.post<{ message: string; refunded_bookings: number }>(
      `/sessions/${id}/cancel`,
    );
    return response.data;
  },
};
