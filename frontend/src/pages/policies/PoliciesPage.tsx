import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, FileText, MoreVertical, Loader2, Users2, Trash2, PenTool, Download, ShieldCheck } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  listPolicies, createPolicy, renewPolicy, setPolicyStatus, addPolicyMember,
  removePolicyMember, signPolicy, downloadPolicyContract, type Policy,
} from '@/services/policyService';
import { listPlans } from '@/services/planService';
import { listCompanies } from '@/services/companyService';
import { listInsured } from '@/services/insuredService';
import { createPolicySchema, type CreatePolicyFormValues } from '@/schemas/policySchema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { getApiErrorMessage } from '@/services/apiClient';
import { toast } from '@/stores/toastStore';

const STATUS_LABELS: Record<string, string> = {
  active: 'Activa', suspended: 'Suspensa', cancelled: 'Cancelada', renewed: 'Renovada', expired: 'Expirada',
};
const STATUS_VARIANT: Record<string, any> = {
  active: 'success', suspended: 'warning', cancelled: 'destructive', renewed: 'default', expired: 'destructive',
};

function CreatePolicyDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: plans } = useQuery({ queryKey: ['plans'], queryFn: listPlans, enabled: open });
  const { data: companiesResult } = useQuery({ queryKey: ['companies-select'], queryFn: () => listCompanies({}), enabled: open });
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreatePolicyFormValues>({
    resolver: zodResolver(createPolicySchema),
  });

  const mutation = useMutation({
    mutationFn: (v: CreatePolicyFormValues) => createPolicy({ ...v, companyId: v.companyId || undefined }),
    onSuccess: () => {
      toast.success('Apólice emitida com sucesso.');
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      reset();
      onClose();
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova Apólice</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))}>
          <DialogBody className="space-y-3">
            <div>
              <Label>Plano</Label>
              <Select className="mt-1" {...register('planId')}>
                <option value="">Seleccionar…</option>
                {plans?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
              {errors.planId && <p className="text-alert text-xs mt-1">{errors.planId.message}</p>}
            </div>
            <div>
              <Label>Empresa (opcional — apólice individual se em branco)</Label>
              <Select className="mt-1" {...register('companyId')}>
                <option value="">Apólice individual</option>
                {companiesResult?.items.map((c) => <option key={c.id} value={c.id}>{c.legalName}</option>)}
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Emissão</Label>
                <Input type="date" className="mt-1" {...register('issueDate')} />
                {errors.issueDate && <p className="text-alert text-xs mt-1">{errors.issueDate.message}</p>}
              </div>
              <div>
                <Label>Início</Label>
                <Input type="date" className="mt-1" {...register('startDate')} />
                {errors.startDate && <p className="text-alert text-xs mt-1">{errors.startDate.message}</p>}
              </div>
              <div>
                <Label>Vencimento</Label>
                <Input type="date" className="mt-1" {...register('endDate')} />
                {errors.endDate && <p className="text-alert text-xs mt-1">{errors.endDate.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor (Kz)</Label>
                <Input type="number" className="mt-1" {...register('value')} />
                {errors.value && <p className="text-alert text-xs mt-1">{errors.value.message}</p>}
              </div>
              <div>
                <Label>Modalidade de pagamento</Label>
                <Select className="mt-1" {...register('paymentMode')}>
                  <option value="monthly">Mensal</option>
                  <option value="quarterly">Trimestral</option>
                  <option value="semiannual">Semestral</option>
                  <option value="annual">Anual</option>
                </Select>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Emitir Apólice'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MembersDialog({ policy, onClose }: { policy: Policy | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [insuredMemberId, setInsuredMemberId] = useState('');
  const { data: insuredResult } = useQuery({
    queryKey: ['insured-select'], queryFn: () => listInsured({}), enabled: !!policy,
  });

  const addMutation = useMutation({
    mutationFn: () => addPolicyMember(policy!.id, insuredMemberId),
    onSuccess: () => {
      toast.success('Beneficiário adicionado.');
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      setInsuredMemberId('');
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => removePolicyMember(policy!.id, memberId),
    onSuccess: () => { toast.success('Beneficiário removido.'); queryClient.invalidateQueries({ queryKey: ['policies'] }); },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  if (!policy) return null;

  return (
    <Dialog open={!!policy} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Beneficiários — {policy.policyNumber}</DialogTitle></DialogHeader>
        <DialogBody className="space-y-4">
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {policy.members.length === 0 && <p className="text-sm text-text-secondary">Nenhum beneficiário associado.</p>}
            {policy.members.map((m) => (
              <div key={m.id} className="flex items-center justify-between text-sm border-b pb-2">
                <span>{m.insuredMember.fullName} <span className="text-text-secondary">({m.insuredMember.internalNumber})</span></span>
                <button onClick={() => removeMutation.mutate(m.insuredMember.id)} className="text-alert p-1 rounded hover:bg-alert/10">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); addMutation.mutate(); }} className="flex gap-2 border-t pt-4">
            <Select value={insuredMemberId} onChange={(e) => setInsuredMemberId(e.target.value)} className="flex-1">
              <option value="">Seleccionar segurado…</option>
              {insuredResult?.items.map((i) => <option key={i.id} value={i.id}>{i.fullName}</option>)}
            </Select>
            <Button type="submit" size="sm" disabled={!insuredMemberId || addMutation.isPending}>
              <Users2 size={14} className="mr-1.5" /> Adicionar
            </Button>
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

export default function PoliciesPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [membersPolicy, setMembersPolicy] = useState<Policy | null>(null);
  const queryClient = useQueryClient();

  const { data: policies, isLoading } = useQuery({ queryKey: ['policies'], queryFn: () => listPolicies() });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['policies'] });
  }

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => setPolicyStatus(id, status),
    onSuccess: () => { toast.success('Estado da apólice actualizado.'); invalidate(); },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const renewMutation = useMutation({
    mutationFn: ({ id, endDate }: { id: string; endDate: string }) => renewPolicy(id, endDate),
    onSuccess: () => { toast.success('Apólice renovada.'); invalidate(); },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const signMutation = useMutation({
    mutationFn: ({ id, signedByName }: { id: string; signedByName: string }) => signPolicy(id, signedByName),
    onSuccess: () => { toast.success('Apólice assinada digitalmente com sucesso.'); invalidate(); },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  async function handleDownloadContract(policy: Policy) {
    try {
      await downloadPolicyContract(policy.id, policy.policyNumber);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  const freshMembersPolicy = policies?.find((p) => p.id === membersPolicy?.id) || membersPolicy;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Apólices</h1>
          <p className="text-text-secondary text-sm">Emissão, renovação e acompanhamento de apólices.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus size={16} className="mr-1.5" /> Nova Apólice</Button>
      </div>

      <div className="bg-card rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface text-text-secondary text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Nº Apólice</th>
              <th className="text-left px-4 py-3">Plano</th>
              <th className="text-left px-4 py-3">Empresa</th>
              <th className="text-left px-4 py-3">Vencimento</th>
              <th className="text-left px-4 py-3">Valor</th>
              <th className="text-left px-4 py-3">Beneficiários</th>
              <th className="text-left px-4 py-3">Estado</th>
              <th className="text-left px-4 py-3">Acções</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading && <tr><td colSpan={8} className="text-center py-6 text-text-secondary">A carregar…</td></tr>}
            {!isLoading && policies?.length === 0 && (
              <tr><td colSpan={8} className="text-center py-6 text-text-secondary">Nenhuma apólice registada.</td></tr>
            )}
            {policies?.map((p) => (
              <tr key={p.id} className="hover:bg-surface/60">
                <td className="px-4 py-3 font-mono text-xs flex items-center gap-2">
                  <FileText size={14} className="text-text-secondary" /> {p.policyNumber}
                </td>
                <td className="px-4 py-3 text-text-secondary">{p.plan.name}</td>
                <td className="px-4 py-3 text-text-secondary">{p.company?.legalName || 'Individual'}</td>
                <td className="px-4 py-3 text-text-secondary">{new Date(p.endDate).toLocaleDateString('pt-PT')}</td>
                <td className="px-4 py-3 text-text-primary">{Number(p.value).toLocaleString()} Kz</td>
                <td className="px-4 py-3">
                  <button onClick={() => setMembersPolicy(p)} className="text-institutional hover:underline">
                    {p.members.length} beneficiário(s)
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={STATUS_VARIANT[p.status]}>{STATUS_LABELS[p.status] || p.status}</Badge>
                    {p.signatureHash && (
                      <span title={`Assinado por ${p.signedByName} em ${p.signedAt ? new Date(p.signedAt).toLocaleDateString('pt-PT') : ''}`}>
                        <ShieldCheck size={14} className="text-vital" />
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                      <button className="p-1.5 rounded hover:bg-muted text-text-secondary"><MoreVertical size={16} /></button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content align="end" className="z-50 w-56 rounded-md border bg-card p-1 shadow-lg text-sm">
                        {!p.signatureHash && (
                          <DropdownMenu.Item
                            onSelect={() => {
                              const name = window.prompt('Nome de quem assina digitalmente:');
                              if (name) signMutation.mutate({ id: p.id, signedByName: name });
                            }}
                            className="px-2 py-2 rounded-sm cursor-pointer hover:bg-muted flex items-center gap-2"
                          >
                            <PenTool size={14} /> Assinar digitalmente
                          </DropdownMenu.Item>
                        )}
                        <DropdownMenu.Item onSelect={() => handleDownloadContract(p)} className="px-2 py-2 rounded-sm cursor-pointer hover:bg-muted flex items-center gap-2">
                          <Download size={14} /> Descarregar contrato (PDF)
                        </DropdownMenu.Item>
                        <DropdownMenu.Separator className="my-1 h-px bg-border" />
                        <DropdownMenu.Item
                          onSelect={() => {
                            const newDate = window.prompt('Nova data de vencimento (AAAA-MM-DD):', p.endDate.slice(0, 10));
                            if (newDate) renewMutation.mutate({ id: p.id, endDate: newDate });
                          }}
                          className="px-2 py-2 rounded-sm cursor-pointer hover:bg-muted"
                        >
                          Renovar
                        </DropdownMenu.Item>
                        {p.status !== 'suspended' && (
                          <DropdownMenu.Item onSelect={() => statusMutation.mutate({ id: p.id, status: 'suspended' })} className="px-2 py-2 rounded-sm cursor-pointer hover:bg-muted">
                            Suspender
                          </DropdownMenu.Item>
                        )}
                        {p.status !== 'active' && (
                          <DropdownMenu.Item onSelect={() => statusMutation.mutate({ id: p.id, status: 'active' })} className="px-2 py-2 rounded-sm cursor-pointer hover:bg-muted">
                            Reactivar
                          </DropdownMenu.Item>
                        )}
                        <DropdownMenu.Item onSelect={() => statusMutation.mutate({ id: p.id, status: 'cancelled' })} className="px-2 py-2 rounded-sm cursor-pointer text-alert hover:bg-alert/10">
                          Cancelar
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CreatePolicyDialog open={showCreate} onClose={() => setShowCreate(false)} />
      <MembersDialog policy={freshMembersPolicy} onClose={() => setMembersPolicy(null)} />
    </div>
  );
}
