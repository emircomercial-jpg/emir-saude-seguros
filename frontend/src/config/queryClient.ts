import { QueryClient } from '@tanstack/react-query';

// Configuração central do TanStack Query. staleTime moderado — os dados
// administrativos (utilizadores, perfis) não mudam a cada segundo, mas
// devem reflectir alterações feitas por outros utilizadores em poucos minutos.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
