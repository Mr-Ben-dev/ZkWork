import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '../lib/types';

interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: true }),
      clearUser: () => {
        localStorage.removeItem('zkwork_token');
        set({ user: null, isAuthenticated: false });
      },
    }),
    {
      name: 'zkwork-user',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
