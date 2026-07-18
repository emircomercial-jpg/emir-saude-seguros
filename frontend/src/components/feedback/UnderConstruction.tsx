import { Construction } from 'lucide-react';

// Placeholder para páginas cujo conteúdo completo chega no Bloco 7 (secção 14
// do briefing: "módulos futuros podem aparecer marcados como 'Em
// desenvolvimento', mas não devem abrir páginas quebradas").
export default function UnderConstruction({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center text-text-secondary">
      <Construction size={32} className="mb-3 text-warning" />
      <h1 className="text-lg font-semibold text-text-primary mb-1">{title}</h1>
      <p className="text-sm">Esta página será implementada no Bloco 7.</p>
    </div>
  );
}
