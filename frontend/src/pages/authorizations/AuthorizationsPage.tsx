import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, ClipboardList, Loader2, Check, XCircle } from 'lucide-react';
import { listAuthorizations, createAuthorization, decideAuthorization } from '@/services/authorizationService';
import { listInsured } from '@/services/insuredService';
import { listProviders } from '@/services/providerService';
import { createAuthorizationSchema, type CreateAuthorizationFormValues } from '@/schemas/authorizationSchema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { getApiErrorMessage } from '@/services/apiClient';
import { toast } from '@/stores/toastStore';

const TYPE_LABELS: Record<string, string> = {
  consulta_especializada: 'Consulta especializada', exame: 'Exame', internamento: 'Internamento',
  cirurgia: 'Cirurgia', medicamento_alto_custo: 'Medicamento de alto custo',
  tratamento_prolongado: 'Tratamento prolongado', fisioterapia: 'Fisioterapia',
  odontologia: 'Odontologia', evacuacao: 'Evacuação', procedimento_especial: 'Procedimento especial',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho', submitted: 'Submetida', in_review: 'Em análise',
  awaiting_documents: 'Aguardando documentos', approved: 'Aprovada',
  partially_approved: 'Aprovada parcialmente', rejected: 'Rejeitada',
  cancelled: 'Cancelada', expired: 'Expirada', used: 'Utilizada',
};

const STATUS_VARIANT: Record<string, any> = {
  submitted: 'default', in_review: 'warning', awaiting_documents: 'warning',
  approved: 'success', partially_approved: 'success', rejected: 'destructive',
  cancelled: 'muted', expired: 'destructive', used: 'muted',
};

function NewAuthorizationDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: insuredResult } = useQuery({ queryKey: ['insured-select'], queryFn: () => listInsured({}), enabled: open });
  const { data: providers } = useQuery({ queryKey: ['providers'], queryFn: () => listProviders(), enabled: open });
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateAuthorizationFormValues>({
    resolver: zodResolver(createAuthorizationSchema),
    defaultValues: { type: 'exame', priority: 'normal' },
  });

  const mutation = useMutation({
    mutationFn: (v: CreateAuthorizationFormValues) => createAuthorization({
      ...v,
      providerId: v.providerId || undefined,
      budget: v.budget ? Number(v.budget) : undefined,
    }),
    onSuccess: () => {
      toast.success('Autorização submetida com sucesso.');
      queryClient.invalidateQueries({ queryKey: ['authorizations'] });
      reset();
      onClose();
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova Solicitação de Autorização</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))}>
          <DialogBody className="space-y-3">
            <div>
              <Label>Segurado</Label>
              <Select className="mt-1" {...register('insuredMemberId')}>
                <option value="">Seleccionar…</option>
                {insuredResult?.items.map((i) => <option key={i.id} value={i.id}>{i.fullName} ({i.internalNumber})</option>)}
              </Select>
              {errors.insuredMemberId && <p className="text-alert text-xs mt-1">{errors.insuredMemberId.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo de solicitação</Label>
                <Select className="mt-1" {...register('type')}>
                  {Object.entries(TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </Select>
              </div>
              <div>
                <Label>Prestador</Label>
                <Select className="mt-1" {...register('providerId')}>
                  <option value="">Não especificado</option>
                  {providers?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              </div>
            </div>
            <div>
              <Label>Médico solicitante</Label>
              <Input className="mt-1" {...register('requestingDoctor')} />
            </div>
            <div>
              <Label>Procedimento solicitado</Label>
              <Input className="mt-1" {...register('requestedProcedure')} />
            </div>
            <div>
              <Label>Justificação clínica</Label>
              <Input className="mt-1" {...register('clinicalJustification')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Orçamento estimado (Kz)</Label>
                <Input type="number" className="mt-1" {...register('budget')} />
              </div>
              <div>
                <Label>Prioridade</Label>
                <Select className="mt-1" {...register('priority')}>
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgente</option>
                </Select>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Submeter Solicitação'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AuthorizationsPage() {
  const [status, setStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: authorizations, isLoading } = useQuery({
    queryKey: ['authorizations', status],
    queryFn: () => listAuthorizations({ status: status || undefined }),
  });

  const decisionMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => decideAuthorization(id, { status }),
    onSuccess: () => {
      toast.success('Decisão registada com sucesso.');
      queryClient.invalidateQueries({ queryKey: ['authorizations'] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Autorizações Médicas</h1>
          <p className="text-text-secondary text-sm">Fluxo de pré-autorização de exames, cirurgias e tratamentos.</p>
        </div>
        <Button onClick={() => setShowForm(true)}><Plus size={16} className="mr-1.5" /> Nova Solicitação</Button>
      </div>

      <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-64 mb-4">
        <option value="">Todos os estados</option>
        {Object.entries(STATUS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </Select>

      <div className="bg-card rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface text-text-secondary text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Nº Solicitação</th>
              <th className="text-left px-4 py-3">Segurado</th>
              <th className="text-left px-4 py-3">Tipo</th>
              <th className="text-left px-4 py-3">Estado</th>
              <th className="text-left px-4 py-3">Acções</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading && <tr><td colSpan={5} className="text-center py-6 text-text-secondary">A carregar…</td></tr>}
            {!isLoading && authorizations?.length === 0 && (
              <tr><td colSpan={5} className="text-center py-6 text-text-secondary">Nenhuma solicitação encontrada.</td></tr>
            )}
            {authorizations?.map((a) => (
              <tr key={a.id} className="hover:bg-surface/60">
                <td className="px-4 py-3 font-mono text-xs flex items-center gap-2">
                  <ClipboardList size={14} className="text-text-secondary" /> {a.requestNumber}
                </td>
                <td className="px-4 py-3 text-text-primary">{a.insuredMember.fullName}</td>
                <td className="px-4 py-3 text-text-secondary">{TYPE_LABELS[a.type] || a.type}</td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_VARIANT[a.status]}>{STATUS_LABELS[a.status] || a.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  {['submitted', 'in_review'].includes(a.status) && (
                    <div className="flex gap-2">
                      <button onClick={() => decisionMutation.mutate({ id: a.id, status: 'approved' })} className="flex items-center gap-1 text-vital text-xs hover:underline">
                        <Check size={14} /> Aprovar
                      </button>
                      <button onClick={() => decisionMutation.mutate({ id: a.id, status: 'rejected' })} className="flex items-center gap-1 text-alert text-xs hover:underline">
                        <XCircle size={14} /> Rejeitar
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <NewAuthorizationDialog open={showForm} onClose={() => setShowForm(false)} />
    </div>
  );
}
