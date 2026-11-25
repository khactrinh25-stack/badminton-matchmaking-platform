import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile } from '../types/auth';

interface AuthState {
  accessToken: string | null;
  user: UserProfile | null;
  setAuth: (accessToken: string, user: UserProfile) => void;
  setUser: (user: UserProfile) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setAuth: (accessToken, user) => set({ accessToken, user }),
      setUser: (user) => set({ user }),
      logout: () => set({ accessToken: null, user: null }),
    }),
    {
      name: 'badminton-auth-storage',
    },
  ),
);
