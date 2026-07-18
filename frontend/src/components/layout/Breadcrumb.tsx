import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  users: 'Utilizadores',
  roles: 'Perfis e Permissões',
  audit: 'Auditoria',
  settings: 'Configurações',
  profile: 'Meu Perfil',
};

export default function Breadcrumb() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  return (
    <nav className="flex items-center gap-1.5 text-sm text-text-secondary mb-4">
      <Link to="/dashboard" className="hover:text-institutional">Início</Link>
      {segments.map((segment, i) => {
        const path = '/' + segments.slice(0, i + 1).join('/');
        const label = LABELS[segment] || segment;
        const isLast = i === segments.length - 1;
        return (
          <span key={path} className="flex items-center gap-1.5">
            <ChevronRight size={14} />
            {isLast ? (
              <span className="text-text-primary font-medium">{label}</span>
            ) : (
              <Link to={path} className="hover:text-institutional">{label}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
