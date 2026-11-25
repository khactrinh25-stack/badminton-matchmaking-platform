import axios, { AxiosError } from 'axios';
import { useAuthStore } from '../stores/authStore';
import type { ApiErrorResponse } from '../types/auth';

const API_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:3000/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    if (error.response?.status === 401) {
      const requestUrl = error.config?.url ?? '';
      const isAuthEndpoint =
        requestUrl.includes('/auth/login') || requestUrl.includes('/auth/register');

      if (!isAuthEndpoint) {
        useAuthStore.getState().logout();
        if (window.location.pathname !== '/login') {
          window.location.assign('/login');
        }
      }
    }
    return Promise.reject(error);
  },
);

export function extractApiErrorMessage(
  error: unknown,
  fallbackMessage = 'Đã có lỗi xảy ra. Vui lòng thử lại.',
): string {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const data = error.response?.data;
    if (data?.message) {
      return Array.isArray(data.message) ? data.message.join(', ') : data.message;
    }
    if (error.message === 'Network Error') {
      return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối.';
    }
  }
  return fallbackMessage;
}
