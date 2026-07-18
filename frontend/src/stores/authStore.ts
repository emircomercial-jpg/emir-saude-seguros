import { create } from 'zustand';
import type { AuthUser } from '@/types/auth';

// Estado de autenticação em memória — propositadamente SEM persistência em
// localStorage/sessionStorage (secção 7 do briefing: "Não guardar tokens
// sensíveis no localStorage"). O access token só existe enquanto a aplicação
// estiver aberta; ao recarregar a página, é obtido de novo através de
// POST /api/auth/refresh, que usa o cookie HTTP-only do refresh token.
interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  isBootstrapping: boolean; // true enquanto se tenta restaurar a sessão ao carregar a app
  setAuth: (accessToken: string, user: AuthUser) => void;
  setAccessToken: (accessToken: string) => void;
  clearAuth: () => void;
  setBootstrapping: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isBootstrapping: true,
  setAuth: (accessToken, user) => set({ accessToken, user }),
  setAccessToken: (accessToken) => set({ accessToken }),
  clearAuth: () => set({ accessToken: null, user: null }),
  setBootstrapping: (value) => set({ isBootstrapping: value }),
}));
