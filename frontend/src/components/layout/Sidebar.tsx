import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Shield, Users2, Building2, ShieldPlus, FileText, CreditCard,
  ClipboardList, Hospital, Stethoscope, Pill, FlaskConical, FileHeart, Undo2,
  Receipt, Wallet, BarChart3, History, UserCog, KeyRound, Settings, X, Plug, Handshake, BookOpen,
} from 'lucide-react';
import { useUiStore } from '@/stores/uiStore';
import { cn } from '@/utils/cn';

// Menu lateral (secção 14 do briefing). Os módulos de negócio ainda não
// implementados nesta fase do projecto aparecem marcados como "Em
// desenvolvimento" — visíveis para dar contexto da visão completa do
// sistema, mas nunca abrindo páginas quebradas (ficam desactivados).
const NAV_ITEMS: { to: string; label: string; icon: any; enabled: boolean }[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, enabled: true },
  { to: '/seguros', label: 'Seguros', icon: Shield, enabled: true },
  { to: '/segurados', label: 'Segurados', icon: Users2, enabled: true },
  { to: '/dependentes', label: 'Dependentes', icon: Users2, enabled: true },
  { to: '/empresas', label: 'Empresas', icon: Building2, enabled: true },
  { to: '/planos', label: 'Planos', icon: ShieldPlus, enabled: true },
  { to: '/apolices', label: 'Apólices', icon: FileText, enabled: true },
  { to: '/cartoes', label: 'Cartões', icon: CreditCard, enabled: true },
  { to: '/autorizacoes', label: 'Autorizações', icon: ClipboardList, enabled: true },
  { to: '/prestadores', label: 'Prestadores', icon: Hospital, enabled: true },
  { to: '/consultas', label: 'Consultas', icon: Stethoscope, enabled: true },
  { to: '/farmacia', label: 'Farmácia', icon: Pill, enabled: true },
  { to: '/laboratorio', label: 'Laboratório', icon: FlaskConical, enabled: true },
  { to: '/sinistros', label: 'Sinistros', icon: FileHeart, enabled: true },
  { to: '/reembolsos', label: 'Reembolsos', icon: Undo2, enabled: true },
  { to: '/facturacao', label: 'Facturação', icon: Receipt, enabled: true },
  { to: '/pagamentos', label: 'Pagamentos', icon: Wallet, enabled: true },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart3, enabled: true },
  { to: '/audit', label: 'Auditoria', icon: History, enabled: true },
  { to: '/users', label: 'Utilizadores', icon: UserCog, enabled: true },
  { to: '/roles', label: 'Perfis e Permissões', icon: KeyRound, enabled: true },
  { to: '/settings', label: 'Configurações', icon: Settings, enabled: true },
  { to: '/integracoes', label: 'Integrações', icon: Plug, enabled: true },
  { to: '/convenios', label: 'Convénios', icon: Handshake, enabled: true },
];

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);

  return (
    <nav className="flex-1 overflow-y-auto py-3">
      {NAV_ITEMS.map(({ to, label, icon: Icon, enabled }) => (
        <NavLink
          key={to}
          to={enabled ? to : '#'}
          onClick={(e) => {
            if (!enabled) e.preventDefault();
            else onNavigate?.();
          }}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors border-l-4',
              enabled
                ? isActive
                  ? 'bg-white/15 border-vital text-white'
                  : 'border-transparent text-white/90 hover:bg-white/10'
                : 'border-transparent text-white/40 cursor-not-allowed',
            )
          }
          title={!enabled ? 'Em desenvolvimento' : undefined}
        >
          <Icon size={18} className="shrink-0" />
          {!collapsed && (
            <span className="truncate flex-1">
              {label}
              {!enabled && <span className="ml-2 text-[10px] uppercase tracking-wide opacity-70">Em breve</span>}
            </span>
          )}
        </NavLink>
      ))}
      <a
        href="/manual/manual-utilizador.pdf"
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => onNavigate?.()}
        className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors border-l-4 border-transparent text-white/90 hover:bg-white/10 mt-2 border-t border-white/10 pt-3"
      >
        <BookOpen size={18} className="shrink-0" />
        {!collapsed && <span className="truncate flex-1">Manual do Utilizador</span>}
      </a>
    </nav>
  );
}

export function DesktopSidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col bg-institutional transition-all duration-200',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      <div className="flex items-center gap-2 px-4 h-16 border-b border-white/10 shrink-0">
        <div className="w-9 h-9 rounded bg-white flex items-center justify-center shrink-0 p-1">
          <img src="/logo/logo-mark.png" alt="EMIR" className="w-full h-full object-contain" />
        </div>
        {!collapsed && <span className="font-semibold text-white truncate">EMIR SAÚDE</span>}
      </div>
      <NavItems />
    </aside>
  );
}

export function MobileSidebar() {
  const open = useUiStore((s) => s.mobileSidebarOpen);
  const setOpen = useUiStore((s) => s.setMobileSidebarOpen);

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setOpen(false)} />}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 bg-institutional flex flex-col transition-transform duration-200 md:hidden',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between px-4 h-16 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded bg-white flex items-center justify-center p-1">
              <img src="/logo/logo-mark.png" alt="EMIR" className="w-full h-full object-contain" />
            </div>
            <span className="font-semibold text-white">EMIR SAÚDE</span>
          </div>
          <button onClick={() => setOpen(false)} className="text-white/80">
            <X size={20} />
          </button>
        </div>
        <NavItems onNavigate={() => setOpen(false)} />
      </aside>
    </>
  );
}
