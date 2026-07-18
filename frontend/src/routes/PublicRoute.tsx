import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

// Rotas públicas (ex: login) — se já existir sessão iniciada, redirecciona
// directamente para o dashboard em vez de mostrar o formulário de login.
export default function PublicRoute() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);

  if (isBootstrapping) return null;
  if (accessToken) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
