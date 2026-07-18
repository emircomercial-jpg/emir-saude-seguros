import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

// Protecção de rota (secção 13 do briefing): bloqueia o acesso directo pela
// URL a quem não tem sessão iniciada. Esta é apenas a camada de conveniência
// da interface — o backend valida sempre a autenticação de forma independente.
export default function ProtectedRoute() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);
  const location = useLocation();

  if (isBootstrapping) {
    return (
      <div className="flex h-screen items-center justify-center text-text-secondary text-sm">
        A verificar sessão…
      </div>
    );
  }

  if (!accessToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
