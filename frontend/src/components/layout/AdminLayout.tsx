import { Outlet } from 'react-router-dom';
import { DesktopSidebar, MobileSidebar } from './Sidebar';
import Header from './Header';
import Breadcrumb from './Breadcrumb';
import Footer from './Footer';

// Layout administrativo (secção 14 do briefing): menu lateral + cabeçalho
// fixo + breadcrumb + área principal + rodapé, com versão para dispositivos
// móveis (menu em painel deslizante).
export default function AdminLayout() {
  return (
    <div className="flex h-screen bg-surface">
      <DesktopSidebar />
      <MobileSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <Breadcrumb />
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}
