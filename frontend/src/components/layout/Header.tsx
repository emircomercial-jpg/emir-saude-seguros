import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  Menu, Search, Wifi, WifiOff, ChevronDown, UserCircle, LogOut, LogOutIcon,
  RefreshCw, ServerOff, CloudOff,
} from 'lucide-react';
import { useUiStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { logout as logoutRequest, logoutAll as logoutAllRequest } from '@/services/authService';
import { toast } from '@/stores/toastStore';
import { useSyncStatus } from '@/hooks/useSyncStatus';

function SyncIndicator() {
  const { status, online, lastSyncAt, syncNow } = useSyncStatus();

  const config: Record<string, { icon: any; text: string; color: string }> = {
    idle: { icon: Wifi, text: 'A verificar…', color: 'text-text-secondary' },
    checking: { icon: RefreshCw, text: 'A verificar…', color: 'text-text-secondary' },
    syncing: { icon: RefreshCw, text: 'A sincronizar…', color: 'text-warning' },
    synced: { icon: Wifi, text: 'Sincronizado', color: 'text-vital' },
    offline: { icon: WifiOff, text: 'Offline', color: 'text-alert' },
    server_unreachable: { icon: ServerOff, text: 'Servidor inacessível', color: 'text-alert' },
    error: { icon: CloudOff, text: 'Erro de sincronização', color: 'text-alert' },
  };
  const current = config[status] || config.idle;
  const Icon = current.icon;
  const isBusy = status === 'checking' || status === 'syncing';

  return (
    <button
      onClick={() => syncNow()}
      disabled={!online || isBusy}
      title={lastSyncAt ? `Última sincronização: ${new Date(lastSyncAt).toLocaleString('pt-PT')}` : 'Ainda não sincronizado'}
      className={`flex items-center gap-1.5 text-xs ${current.color} disabled:opacity-60`}
    >
      <Icon size={16} className={isBusy ? 'animate-spin' : ''} />
      <span className="hidden sm:inline">{current.text}</span>
    </button>
  );
}

function GlobalSearch() {
  const [term, setTerm] = useState('');
  const navigate = useNavigate();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!term.trim()) return;
    // Pesquisa global funcional (secção 14): nesta fase, procura por
    // utilizadores pelo nome/e-mail — a pesquisa cruzada com outros módulos
    // será alargada à medida que forem implementados.
    navigate(`/users?search=${encodeURIComponent(term.trim())}`);
  }

  return (
    <form onSubmit={handleSubmit} className="relative hidden sm:block w-64">
      <Search size={16} className="absolute left-3 top-2.5 text-text-secondary" />
      <input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Pesquisar utilizadores…"
        className="w-full h-9 rounded-md border border-input bg-background pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </form>
  );
}

function AccountMenu() {
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await logoutRequest();
    } finally {
      clearAuth();
      toast.info('Sessão terminada.');
      navigate('/login');
    }
  }

  async function handleLogoutAll() {
    try {
      await logoutAllRequest();
      toast.success('Sessão terminada em todos os dispositivos.');
    } finally {
      clearAuth();
      navigate('/login');
    }
  }

  if (!user) return null;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted">
          <div className="w-8 h-8 rounded-full bg-institutional text-white flex items-center justify-center text-sm font-medium overflow-hidden">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
            ) : (
              user.fullName.charAt(0).toUpperCase()
            )}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-sm font-medium text-text-primary leading-tight">{user.fullName}</p>
            <p className="text-xs text-text-secondary leading-tight">{user.roles[0]?.name || '—'}</p>
          </div>
          <ChevronDown size={16} className="text-text-secondary" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-56 rounded-md border bg-card p-1 shadow-lg"
        >
          <DropdownMenu.Item
            onSelect={() => navigate('/profile')}
            className="flex items-center gap-2 rounded-sm px-2 py-2 text-sm cursor-pointer outline-none hover:bg-muted"
          >
            <UserCircle size={16} /> Meu perfil
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item
            onSelect={handleLogoutAll}
            className="flex items-center gap-2 rounded-sm px-2 py-2 text-sm cursor-pointer outline-none hover:bg-muted"
          >
            <LogOutIcon size={16} /> Terminar sessão em todos os dispositivos
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={handleLogout}
            className="flex items-center gap-2 rounded-sm px-2 py-2 text-sm cursor-pointer outline-none text-alert hover:bg-alert/10"
          >
            <LogOut size={16} /> Terminar sessão
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export default function Header() {
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const setMobileSidebarOpen = useUiStore((s) => s.setMobileSidebarOpen);

  return (
    <header className="h-16 bg-card border-b flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="md:hidden p-2 rounded hover:bg-muted text-text-secondary"
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>
        <button
          onClick={toggleSidebar}
          className="hidden md:inline-flex p-2 rounded hover:bg-muted text-text-secondary"
          aria-label="Recolher/expandir menu"
        >
          <Menu size={20} />
        </button>
        <GlobalSearch />
      </div>

      <div className="flex items-center gap-4">
        <SyncIndicator />
        <AccountMenu />
      </div>
    </header>
  );
}
