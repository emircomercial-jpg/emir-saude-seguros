import axios, { AxiosError } from 'axios';
import { env } from '@/config/env';
import { useAuthStore } from '@/stores/authStore';
import type { ApiErrorResponse, ApiSuccessResponse } from '@/types/api';
import type { LoginResponseData } from '@/types/auth';

// Cliente HTTP central (secção 3 do briefing). "withCredentials: true" é
// obrigatório para que o cookie HTTP-only do refresh token seja enviado ao
// backend em /api/auth/refresh — o token de acesso, esse, vai sempre no
// cabeçalho Authorization, nunca em cookies nem em localStorage.
export const apiClient = axios.create({
  baseURL: env.apiUrl,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string> | null = null;

// Quando o access token expira (401), tenta renová-lo uma única vez através
// do cookie HTTP-only do refresh token, sem forçar o utilizador a fazer
// login de novo. Se a renovação também falhar, a sessão é terminada.
async function refreshAccessToken(): Promise<string> {
  const response = await axios.post<ApiSuccessResponse<{ accessToken: string }>>(
    `${env.apiUrl}/auth/refresh`,
    {},
    { withCredentials: true },
  );
  const { accessToken } = response.data.data;
  useAuthStore.getState().setAccessToken(accessToken);
  return accessToken;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as (typeof error.config & { _retry?: boolean }) | undefined;

    const isAuthRoute = originalRequest?.url?.includes('/auth/login') || originalRequest?.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthRoute) {
      originalRequest._retry = true;
      try {
        refreshPromise = refreshPromise || refreshAccessToken();
        const newToken = await refreshPromise;
        refreshPromise = null;
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        refreshPromise = null;
        useAuthStore.getState().clearAuth();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

// Extrai a mensagem de erro do formato padrão da API (secção 25), com
// fallback genérico para erros de rede ou respostas inesperadas.
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiErrorResponse | undefined;
    if (data?.message) return data.message;
    if (error.message) return error.message;
  }
  return 'Ocorreu um erro inesperado. Tente novamente.';
}

export type { LoginResponseData };
