import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/config/queryClient';
import { useAuthBootstrap } from '@/hooks/useAuthBootstrap';
import { useKeepAlive } from '@/hooks/useKeepAlive';
import AppRoutes from '@/routes/AppRoutes';
import ToastContainer from '@/components/feedback/ToastContainer';

function AppShell() {
  // Tenta restaurar a sessão a partir do cookie de refresh assim que a
  // aplicação arranca (ver hooks/useAuthBootstrap.ts).
  useAuthBootstrap();
  // Mantém o servidor acordado durante o uso activo (ver hooks/useKeepAlive.ts).
  useKeepAlive();
  return (
    <>
      <AppRoutes />
      <ToastContainer />
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
