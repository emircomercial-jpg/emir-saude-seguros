import { Outlet, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { logout as logoutRequest } from '@/services/authService';
import ToastContainer from '@/components/feedback/ToastContainer';

// Layout minimalista do portal de auto-serviço — deliberadamente mais
// simples do que o layout administrativo (sem o menu com os módulos de
// gestão, aos quais os segurados/prestadores não têm nem devem ter acesso).
export default function PortalLayout({ title }: { title: string }) {
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await logoutRequest();
    } finally {
      clearAuth();
      navigate('/login');
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="h-16 bg-institutional text-white flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-white flex items-center justify-center p-1">
            <img src="/logo/logo-mark.png" alt="EMIR" className="w-full h-full object-contain" />
          </div>
          <span className="font-semibold">EMIR SAÚDE SEGUROS — {title}</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span>{user?.fullName}</span>
          <button onClick={handleLogout} className="flex items-center gap-1.5 hover:underline">
            <LogOut size={14} /> Sair
          </button>
        </div>
      </header>
      <main className="max-w-4xl mx-auto p-6">
        <Outlet />
      </main>
      <ToastContainer />
    </div>
  );
}
