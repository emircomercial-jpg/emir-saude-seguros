import axios, { AxiosError } from 'axios';
import { env } from '@/config/env';
import { useAuthStore } from '@/stores/authStore';
import type { ApiErrorResponse, ApiSuccessResponse } from '@/types/api';
import type { LoginResponseData } from '@/types/auth';

// Cliente HTTP central (secção 3 do briefing). "withCredentials: true" é
// obrigatório para que o cookie HTTP-only do refresh token seja enviado ao
// backend em /api/auth/refresh — o token de acesso, esse, vai sempre no
// cabeçalho Authorization, nunca em cookies nem em localStorage.
//
// "timeout: 60s" é propositadamente generoso: o plano gratuito do servidor
// "adormece" ao fim de 15 minutos sem uso, e demora até 50 segundos a
// arrancar de novo na primeira chamada seguinte — um tempo-limite mais
// curto interromperia esse arranque a meio e pareceria "perda de ligação
// à internet", quando na realidade o servidor só estava a acordar.
export const apiClient = axios.create({
  baseURL: env.apiUrl,
  withCredentials: true,
  timeout: 60_000,
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
    const originalRequest = error.config as
      | (typeof error.config & { _retry?: boolean; _retryCount?: number })
      | undefined;

    // Repetição automática só para falhas genuínas de rede/ligação (sem
    // resposta nenhuma do servidor, ou erros 502/503/504 típicos de um
    // servidor ainda a arrancar) — nunca para erros de validação ou de
    // autenticação, que são respostas válidas do servidor, não problemas
    // de ligação. Até 2 tentativas extra, com um pequeno intervalo entre
    // elas, para dar tempo ao servidor de "acordar" sem sobrecarregar.
    const isConnectionIssue =
      !error.response || [502, 503, 504].includes(error.response.status);
    const isAuthRoute = originalRequest?.url?.includes('/auth/');

    if (isConnectionIssue && originalRequest && !isAuthRoute) {
      const retryCount = originalRequest._retryCount ?? 0;
      if (retryCount < 2) {
        originalRequest._retryCount = retryCount + 1;
        await new Promise((resolve) => setTimeout(resolve, 2500 * (retryCount + 1)));
        return apiClient(originalRequest);
      }
    }

    const isAuthRouteForRefresh = originalRequest?.url?.includes('/auth/login') || originalRequest?.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthRouteForRefresh) {
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
    // Sem resposta nenhuma do servidor — mais provável ser o servidor
    // ainda a arrancar do que uma perda de ligação genuína, já se
    // tentou novamente automaticamente antes de chegar aqui.
    if (!error.response) {
      return 'Não foi possível ligar ao servidor. Verifica a tua ligação à internet e tenta novamente — se for a primeira utilização em alguns minutos, o servidor pode demorar até um minuto a arrancar.';
    }
    if (error.message) return error.message;
  }
  return 'Ocorreu um erro inesperado. Tente novamente.';
}

export type { LoginResponseData };
