import { create } from 'zustand';
import type { AuthSession, CurrentUser } from '@enterprise/api-contracts';

type MenuItem = AuthSession['menus'][number];

type AuthState = {
  accessToken: string | null;
  user: CurrentUser | null;
  menus: MenuItem[];
  setSession: (session: AuthSession) => void;
  clear: () => void;
  can: (permission?: string) => boolean;
};

const STORAGE_KEY = 'enterprise-admin-session';

const readSession = (): Pick<AuthState, 'accessToken' | 'user' | 'menus'> => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { accessToken: null, user: null, menus: [] };
  try {
    return JSON.parse(raw) as Pick<AuthState, 'accessToken' | 'user' | 'menus'>;
  } catch {
    return { accessToken: null, user: null, menus: [] };
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  ...readSession(),
  setSession: (session) => {
    const next = {
      accessToken: session.accessToken,
      user: session.user,
      menus: session.menus,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    set(next);
  },
  clear: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ accessToken: null, user: null, menus: [] });
  },
  can: (permission) => !permission || Boolean(get().user?.permissions.includes(permission)),
}));
