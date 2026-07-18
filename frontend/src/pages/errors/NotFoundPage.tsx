import { Link } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center text-center px-4">
      <FileQuestion size={40} className="text-text-secondary mb-4" />
      <h1 className="text-2xl font-semibold text-text-primary mb-2">Página não encontrada</h1>
      <p className="text-text-secondary mb-6">O endereço acedido não existe ou foi movido.</p>
      <Button asChild>
        <Link to="/dashboard">Voltar ao início</Link>
      </Button>
    </div>
  );
}
