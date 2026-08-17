import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Handshake, Loader2, Trash2, MoreVertical } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  listAgreements, createAgreement, updateAgreementStatus, deleteAgreement, type InsuranceAgreement,
} from '@/services/agreementService';
import { createAgreementSchema, type CreateAgreementFormValues } from '@/schemas/agreementSchema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { getApiErrorMessage } from '@/services/apiClient';
import { toast } from '@/stores/toastStore';

// "Convénios" — acordos institucionais com OUTRAS agências seguradoras
// (partilha de risco, reciprocidade de cobertura, encaminhamento de
// clientes) — não confundir com Prestadores (clínicas/hospitais) nem com
// Empresas (clientes que contratam apólices).

const TYPE_LABELS: Record<string, string> = {
  reciprocal_coverage: 'Cobertura recíproca',
  reinsurance: 'Resseguro',
  referral: 'Encaminhamento de clientes',
  co_insurance: 'Co-seguro',
  other: 'Outro',
};
const STATUS_LABELS: Record<string, string> = {
  active: 'Activo', suspended: 'Suspenso', expired: 'Expirado', cancelled: 'Cancelado',
};
const STATUS_VARIANT: Record<string, any> = {
  active: 'success', suspended: 'warning', expired: 'muted', cancelled: 'destructive',
};

export default function AgreementsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();

  const { data: agreements, isLoading } = useQuery({ queryKey: ['agreements'], queryFn: listAgreements });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateAgreementStatus(id, status),
    onSuccess: () => { toast.success('Estado actualizado.'); queryClient.invalidateQueries({ queryKey: ['agreements'] }); },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAgreement,
    onSuccess: () => { toast.success('Convénio removido.'); queryClient.invalidateQueries({ queryKey: ['agreements'] }); },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-text-primary flex items-center gap-2">
            <Handshake size={20} /> Convénios com outras seguradoras
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">Acordos de cobertura recíproca, resseguro, ou encaminhamento com agências parceiras.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus size={16} className="mr-1.5" /> Novo Convénio</Button>
      </div>

      <div className="bg-card rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-text-secondary">
            <tr>
              <th className="px-4 py-3 font-medium">Seguradora Parceira</th>
              <th className="px-4 py-3 font-medium">Tipo de Acordo</th>
              <th className="px-4 py-3 font-medium">Contacto</th>
              <th className="px-4 py-3 font-medium">Início</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium text-right">Acções</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} className="px-4 py-8 text-center text-text-secondary"><Loader2 className="animate-spin inline" size={18} /> A carregar...</td></tr>}
            {!isLoading && (agreements?.length ?? 0) === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-text-secondary">Nenhum convénio registado ainda.</td></tr>
            )}
            {agreements?.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="px-4 py-3">
                  {a.agencyName}
                  {a.agencyNif && <span className="text-text-secondary text-xs ml-1">({a.agencyNif})</span>}
                </td>
                <td className="px-4 py-3">{TYPE_LABELS[a.agreementType] || a.agreementType}</td>
                <td className="px-4 py-3">
                  {a.contactName || '—'}
                  {a.contactEmail && <div className="text-text-secondary text-xs">{a.contactEmail}</div>}
                </td>
                <td className="px-4 py-3">{new Date(a.startDate).toLocaleDateString('pt-PT')}</td>
                <td className="px-4 py-3"><Badge variant={STATUS_VARIANT[a.status]}>{STATUS_LABELS[a.status] || a.status}</Badge></td>
                <td className="px-4 py-3 text-right">
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                      <button className="p-1 hover:bg-muted rounded"><MoreVertical size={16} /></button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content align="end" className="bg-card border rounded-md shadow-lg p-1 text-sm min-w-[180px]">
                        {a.status === 'active' ? (
                          <DropdownMenu.Item onSelect={() => statusMutation.mutate({ id: a.id, status: 'suspended' })} className="px-2 py-2 rounded-sm cursor-pointer hover:bg-muted">
                            Suspender
                          </DropdownMenu.Item>
                        ) : (
                          <DropdownMenu.Item onSelect={() => statusMutation.mutate({ id: a.id, status: 'active' })} className="px-2 py-2 rounded-sm cursor-pointer hover:bg-muted">
                            Reactivar
                          </DropdownMenu.Item>
                        )}
                        <DropdownMenu.Item
                          onSelect={() => confirm(`Remover o convénio com "${a.agencyName}"?`) && deleteMutation.mutate(a.id)}
                          className="px-2 py-2 rounded-sm cursor-pointer hover:bg-muted text-alert flex items-center gap-2"
                        >
                          <Trash2 size={14} /> Remover
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

      <CreateAgreementDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}

function CreateAgreementDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateAgreementFormValues>({
    resolver: zodResolver(createAgreementSchema),
  });

  const mutation = useMutation({
    mutationFn: (v: CreateAgreementFormValues) => createAgreement({ ...v, contactEmail: v.contactEmail || undefined }),
    onSuccess: () => {
      toast.success('Convénio criado com sucesso.');
      queryClient.invalidateQueries({ queryKey: ['agreements'] });
      reset();
      onClose();
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo Convénio com Seguradora</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))}>
          <DialogBody className="space-y-3">
            <div>
              <Label>Nome da seguradora parceira</Label>
              <Input className="mt-1" {...register('agencyName')} />
              {errors.agencyName && <p className="text-alert text-xs mt-1">{errors.agencyName.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>NIF</Label>
                <Input className="mt-1" {...register('agencyNif')} />
              </div>
              <div>
                <Label>Tipo de acordo</Label>
                <Select className="mt-1" {...register('agreementType')}>
                  <option value="reciprocal_coverage">Cobertura recíproca</option>
                  <option value="reinsurance">Resseguro</option>
                  <option value="referral">Encaminhamento de clientes</option>
                  <option value="co_insurance">Co-seguro</option>
                  <option value="other">Outro</option>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Pessoa de contacto</Label>
                <Input className="mt-1" {...register('contactName')} />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input className="mt-1" {...register('contactPhone')} />
              </div>
            </div>
            <div>
              <Label>E-mail de contacto</Label>
              <Input type="email" className="mt-1" {...register('contactEmail')} />
              {errors.contactEmail && <p className="text-alert text-xs mt-1">{errors.contactEmail.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Início</Label>
                <Input type="date" className="mt-1" {...register('startDate')} />
                {errors.startDate && <p className="text-alert text-xs mt-1">{errors.startDate.message}</p>}
              </div>
              <div>
                <Label>Fim (opcional)</Label>
                <Input type="date" className="mt-1" {...register('endDate')} />
              </div>
            </div>
            <div>
              <Label>Âmbito do acordo</Label>
              <Input className="mt-1" placeholder="Ex: Cobertura recíproca em Benguela e Huambo" {...register('scope')} />
            </div>
            <div>
              <Label>Notas</Label>
              <Input className="mt-1" {...register('notes')} />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Criar Convénio'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
