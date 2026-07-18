import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Página 403 (secção 13 do briefing): mostrada quando o utilizador tenta
// aceder a uma área para a qual não tem permissão — nunca apenas um ecrã em
// branco ou um erro genérico.
export default function ForbiddenPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center text-center px-4">
      <ShieldAlert size={40} className="text-alert mb-4" />
      <h1 className="text-2xl font-semibold text-text-primary mb-2">Acesso não autorizado</h1>
      <p className="text-text-secondary mb-6">A sua conta não tem permissão para aceder a esta área.</p>
      <Button asChild>
        <Link to="/dashboard">Voltar ao início</Link>
      </Button>
    </div>
  );
}
