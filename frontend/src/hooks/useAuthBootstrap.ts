import { useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';
import { env } from '@/config/env';
import { fetchMe } from '@/services/authService';

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// Ao carregar a aplicação, tenta restaurar a sessão a partir do cookie
// HTTP-only do refresh token (o access token, em memória, perde-se sempre
// que a página é recarregada — secção 7 do briefing). Se não houver sessão
// válida, a aplicação simplesmente trata o utilizador como não autenticado,
// sem qualquer erro visível.
export function useAuthBootstrap() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const setBootstrapping = useAuthStore((s) => s.setBootstrapping);
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const csrfToken = readCookie('csrfToken');
        const response = await axios.post(
          `${env.apiUrl}/auth/refresh`,
          {},
          { withCredentials: true, headers: csrfToken ? { 'x-csrf-token': csrfToken } : undefined },
        );
        const accessToken = response.data.data.accessToken as string;
        useAuthStore.getState().setAccessToken(accessToken);

        const user = await fetchMe();
        if (!cancelled) setAuth(accessToken, user);
      } catch {
        if (!cancelled) clearAuth();
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isBootstrapping };
}
