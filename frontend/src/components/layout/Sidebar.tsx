import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Shield, Users2, Building2, ShieldPlus, FileText, CreditCard,
  ClipboardList, Hospital, Stethoscope, Pill, FlaskConical, FileHeart, Undo2,
  Receipt, Wallet, BarChart3, History, UserCog, KeyRound, Settings, X, Plug, Handshake, BookOpen, Download, Building,
} from 'lucide-react';
import { useUiStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/utils/cn';
import { downloadManual, downloadPrivacyPolicy } from '@/utils/downloadManual';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';

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

function detectPlatform(): 'ios' | 'android' | 'desktop' {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

const INSTALL_INSTRUCTIONS: Record<'ios' | 'android' | 'desktop', string[]> = {
  ios: [
    'Toca no botão Partilhar (o quadrado com a seta para cima), na barra do Safari.',
    'Desce e escolhe "Adicionar ao Ecrã Principal".',
    'Confirma tocando em "Adicionar", no canto superior direito.',
  ],
  android: [
    'Toca nos três pontos, no canto superior direito do Chrome.',
    'Escolhe "Instalar aplicação" ou "Adicionar ao ecrã principal".',
    'Confirma a instalação.',
  ],
  desktop: [
    'Procura o ícone de instalação (um monitor com uma seta), na barra de endereço do browser.',
    'Se não aparecer, abre o menu do browser (três pontos) e procura "Instalar EMIR SAÚDE SEGUROS".',
  ],
};

function InstallAppButton({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { canInstall, installed, promptInstall } = useInstallPrompt();
  const [showManualInstructions, setShowManualInstructions] = useState(false);

  if (installed) return null;

  return (
    <>
      <button
        onClick={() => {
          if (canInstall) { promptInstall(); onNavigate?.(); }
          else setShowManualInstructions(true);
        }}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors border-l-4 border-vital bg-vital/10 text-white hover:bg-vital/20"
      >
        <Download size={18} className="shrink-0" />
        {!collapsed && <span className="truncate flex-1 text-left font-medium">Instalar Aplicativo</span>}
      </button>
      {showManualInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowManualInstructions(false)}>
          <div className="bg-card rounded-lg p-5 max-w-sm w-full text-text-primary" onClick={(e) => e.stopPropagation()}>
            <p className="font-medium mb-3">Como instalar no teu dispositivo</p>
            <ol className="list-decimal list-inside space-y-2 text-sm text-text-secondary">
              {INSTALL_INSTRUCTIONS[detectPlatform()].map((step, i) => <li key={i}>{step}</li>)}
            </ol>
            <button
              onClick={() => setShowManualInstructions(false)}
              className="mt-4 w-full py-2 bg-institutional text-white rounded-md text-sm"
            >
              Percebi
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const isPlatformAdmin = useAuthStore((s) => s.user?.isPlatformAdmin);

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
      {isPlatformAdmin && (
        <NavLink
          to="/plataforma"
          onClick={() => onNavigate?.()}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors border-l-4 border-t border-white/10 mt-1 pt-3.5',
              isActive ? 'bg-vital/20 border-vital text-white' : 'border-vital/60 text-white/90 hover:bg-white/10',
            )
          }
        >
          <Building size={18} className="shrink-0" />
          {!collapsed && <span className="truncate flex-1 font-medium">Plataforma</span>}
        </NavLink>
      )}
      <button
        onClick={async () => {
          await downloadManual();
          onNavigate?.();
        }}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors border-l-4 border-transparent text-white/90 hover:bg-white/10 mt-2 border-t border-white/10 pt-3"
      >
        <BookOpen size={18} className="shrink-0" />
        {!collapsed && <span className="truncate flex-1 text-left">Manual do Utilizador</span>}
      </button>
      <button
        onClick={async () => {
          await downloadPrivacyPolicy();
          onNavigate?.();
        }}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors border-l-4 border-transparent text-white/90 hover:bg-white/10"
      >
        <FileText size={18} className="shrink-0" />
        {!collapsed && <span className="truncate flex-1 text-left">Política de Privacidade</span>}
      </button>
      <InstallAppButton collapsed={collapsed} onNavigate={onNavigate} />
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
