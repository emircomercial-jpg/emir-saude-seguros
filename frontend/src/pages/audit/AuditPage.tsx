import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { History } from 'lucide-react';
import { listAuditLogs } from '@/services/auditService';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

const MODULES = ['auth', 'users', 'roles', 'settings'];

export default function AuditPage() {
  const [filters, setFilters] = useState({ module: '', action: '', from: '', to: '' });
  const [page, setPage] = useState(1);
  const [applied, setApplied] = useState(filters);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', applied, page],
    queryFn: () =>
      listAuditLogs({
        module: applied.module || undefined,
        action: applied.action || undefined,
        from: applied.from || undefined,
        to: applied.to || undefined,
        page,
        pageSize: 15,
      }),
  });

  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary mb-1">Auditoria</h1>
      <p className="text-text-secondary text-sm mb-4">
        Histórico de acções sensíveis no sistema. Estes registos nunca podem ser editados ou eliminados.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
        <Select value={filters.module} onChange={(e) => setFilters((f) => ({ ...f, module: e.target.value }))}>
          <option value="">Todos os módulos</option>
          {MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
        </Select>
        <Input placeholder="Acção (ex: login)" value={filters.action} onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))} />
        <Input type="date" value={filters.from} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))} />
        <Input type="date" value={filters.to} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))} />
      </div>
      <Button size="sm" className="mb-4" onClick={() => { setPage(1); setApplied(filters); }}>Filtrar</Button>

      <div className="bg-card rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface text-text-secondary text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Data</th>
              <th className="text-left px-4 py-3">Utilizador</th>
              <th className="text-left px-4 py-3">Acção</th>
              <th className="text-left px-4 py-3">Módulo</th>
              <th className="text-left px-4 py-3">Descrição</th>
              <th className="text-left px-4 py-3">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading && <tr><td colSpan={6} className="text-center py-6 text-text-secondary">A carregar…</td></tr>}
            {!isLoading && data?.items.length === 0 && (
              <tr><td colSpan={6} className="text-center py-6 text-text-secondary">
                <History size={24} className="mx-auto mb-2 opacity-50" /> Nenhum registo encontrado.
              </td></tr>
            )}
            {data?.items.map((log) => (
              <tr key={log.id} className="hover:bg-surface/60">
                <td className="px-4 py-3 text-text-secondary whitespace-nowrap">{new Date(log.createdAt).toLocaleString('pt-PT')}</td>
                <td className="px-4 py-3 text-text-primary">{log.user?.fullName || 'Sistema'}</td>
                <td className="px-4 py-3 text-text-secondary">{log.action}</td>
                <td className="px-4 py-3 text-text-secondary">{log.module}</td>
                <td className="px-4 py-3 text-text-secondary">{log.description}</td>
                <td className="px-4 py-3 text-text-secondary">{log.ipAddress || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-text-secondary">
          <span>Página {data.meta.page} de {data.meta.totalPages} · {data.meta.totalItems} registos</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
            <Button variant="outline" size="sm" disabled={page >= data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>Seguinte</Button>
          </div>
        </div>
      )}
    </div>
  );
}
