import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plug, Plus, Trash2, Loader2, Copy, ExternalLink, AlertTriangle } from 'lucide-react';
import {
  listApiKeys, createApiKey, revokeApiKey, listExternalInvoices,
} from '@/services/integrationService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getApiErrorMessage } from '@/services/apiClient';
import { toast } from '@/stores/toastStore';

// "Integrações" — gestão das chaves usadas por sistemas externos (ex: um
// sistema de facturação separado) para enviar dados para cá, e visão das
// facturas já recebidas por essa via. Ver
// documentation/external-billing-integration.md para o contrato completo
// da API que um sistema externo tem de seguir.

const statusLabels: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'muted' }> = {
  draft: { label: 'Rascunho', variant: 'muted' },
  issued: { label: 'Emitida', variant: 'warning' },
  paid: { label: 'Paga', variant: 'success' },
  cancelled: { label: 'Cancelada', variant: 'destructive' },
};

export default function IntegrationsPage() {
  const [newKeyName, setNewKeyName] = useState('');
  const [justCreatedKey, setJustCreatedKey] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: keys, isLoading: loadingKeys } = useQuery({ queryKey: ['integration-api-keys'], queryFn: listApiKeys });
  const { data: invoicesResult, isLoading: loadingInvoices } = useQuery({
    queryKey: ['external-invoices'],
    queryFn: () => listExternalInvoices({ pageSize: 50 }),
  });

  const createMutation = useMutation({
    mutationFn: createApiKey,
    onSuccess: (data) => {
      setJustCreatedKey(data.key);
      setNewKeyName('');
      queryClient.invalidateQueries({ queryKey: ['integration-api-keys'] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const revokeMutation = useMutation({
    mutationFn: revokeApiKey,
    onSuccess: () => {
      toast.success('Chave revogada.');
      queryClient.invalidateQueries({ queryKey: ['integration-api-keys'] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const activeKeys = (keys ?? []).filter((k) => !k.revokedAt);
  const revokedKeys = (keys ?? []).filter((k) => k.revokedAt);

  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary mb-1 flex items-center gap-2">
        <Plug size={20} /> Integrações
      </h1>
      <p className="text-sm text-text-secondary mb-5">
        Chaves para sistemas externos (ex: o teu sistema de facturação) enviarem dados para aqui, e as facturas já recebidas por essa via.
      </p>

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">Chaves de integração</CardTitle></CardHeader>
        <CardContent>
          {justCreatedKey && (
            <div className="mb-4 p-3 rounded-md bg-warning/10 border border-warning">
              <p className="text-sm font-medium flex items-center gap-1.5 mb-1">
                <AlertTriangle size={14} /> Copia esta chave agora — não voltará a ser mostrada:
              </p>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-card px-2 py-1 rounded border flex-1 overflow-x-auto">{justCreatedKey}</code>
                <button
                  onClick={() => { navigator.clipboard.writeText(justCreatedKey); toast.success('Copiado.'); }}
                  className="p-1.5 hover:bg-muted rounded"
                  title="Copiar"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Nome da chave (ex: sistema-facturacao)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="max-w-xs"
            />
            <Button
              onClick={() => newKeyName.trim() && createMutation.mutate(newKeyName.trim())}
              disabled={!newKeyName.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <><Plus size={15} className="mr-1" /> Criar chave</>}
            </Button>
          </div>

          {loadingKeys && <p className="text-text-secondary text-sm">A carregar...</p>}

          {!loadingKeys && activeKeys.length === 0 && (
            <p className="text-text-secondary text-sm">Nenhuma chave activa. Cria uma para ligar um sistema externo.</p>
          )}

          {activeKeys.map((key) => (
            <div key={key.id} className="flex items-center justify-between text-sm border-b py-2 last:border-b-0">
              <div>
                <span className="font-medium">{key.name}</span>
                <span className="text-text-secondary ml-2 text-xs">
                  {key.lastUsedAt ? `último uso: ${new Date(key.lastUsedAt).toLocaleString('pt-PT')}` : 'nunca usada'}
                </span>
              </div>
              <button
                onClick={() => revokeMutation.mutate(key.id)}
                className="text-alert hover:opacity-70 p-1"
                title="Revogar chave"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}

          {revokedKeys.length > 0 && (
            <details className="mt-3">
              <summary className="text-xs text-text-secondary cursor-pointer">Chaves revogadas ({revokedKeys.length})</summary>
              {revokedKeys.map((key) => (
                <div key={key.id} className="text-xs text-text-secondary py-1">{key.name} — revogada em {new Date(key.revokedAt!).toLocaleDateString('pt-PT')}</div>
              ))}
            </details>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><ExternalLink size={15} /> Facturas recebidas de sistemas externos</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingInvoices && <p className="text-text-secondary text-sm">A carregar...</p>}
          {!loadingInvoices && (invoicesResult?.items.length ?? 0) === 0 && (
            <p className="text-text-secondary text-sm">Nenhuma factura recebida ainda.</p>
          )}
          {invoicesResult?.items.map((inv) => {
            const s = statusLabels[inv.status] ?? { label: inv.status, variant: 'muted' as const };
            return (
              <div key={inv.id} className="flex items-center justify-between text-sm border-b py-2 last:border-b-0">
                <div>
                  <span className="font-medium">{inv.invoiceNumber}</span>
                  <span className="text-text-secondary ml-2">{inv.customerName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span>{Number(inv.totalValue).toLocaleString()} Kz</span>
                  <Badge variant={s.variant}>{s.label}</Badge>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
