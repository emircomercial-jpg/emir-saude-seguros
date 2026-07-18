import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Search, MoreVertical, UserPlus2, Loader2, Trash2, CreditCard, MessageCircle } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  listInsured, createInsured, deleteInsured, setInsuredStatus, addDependent,
  removeDependent, getInsured, type InsuredMember,
} from '@/services/insuredService';
import { issueCard } from '@/services/cardService';
import { openWhatsApp } from '@/utils/whatsapp';
import { createInsuredSchema, type CreateInsuredFormValues } from '@/schemas/insuredSchema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { getApiErrorMessage } from '@/services/apiClient';
import { toast } from '@/stores/toastStore';

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo', suspended: 'Suspenso', inactive: 'Inactivo', cancelled: 'Cancelado',
  waiting_period: 'Em carência', expired: 'Expirado', pending_approval: 'Aguardando aprovação',
  blocked_nonpayment: 'Bloqueado por falta de pagamento',
};
const STATUS_VARIANT: Record<string, any> = {
  active: 'success', suspended: 'warning', inactive: 'muted', cancelled: 'destructive',
  waiting_period: 'default', expired: 'destructive', pending_approval: 'warning', blocked_nonpayment: 'destructive',
};

function CreateInsuredDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateInsuredFormValues>({
    resolver: zodResolver(createInsuredSchema),
  });

  const mutation = useMutation({
    mutationFn: (v: CreateInsuredFormValues) => createInsured({ ...v, email: v.email || undefined }),
    onSuccess: () => {
      toast.success('Segurado criado com sucesso.');
      queryClient.invalidateQueries({ queryKey: ['insured'] });
      reset();
      onClose();
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo Segurado</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))}>
          <DialogBody className="space-y-3">
            <div>
              <Label>Nome completo</Label>
              <Input className="mt-1" {...register('fullName')} />
              {errors.fullName && <p className="text-alert text-xs mt-1">{errors.fullName.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data de nascimento</Label>
                <Input type="date" className="mt-1" {...register('birthDate')} />
                {errors.birthDate && <p className="text-alert text-xs mt-1">{errors.birthDate.message}</p>}
              </div>
              <div>
                <Label>Sexo</Label>
                <Select className="mt-1" {...register('sex')}>
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Bilhete de Identidade</Label>
                <Input className="mt-1" {...register('idDocumentNumber')} />
                {errors.idDocumentNumber && <p className="text-alert text-xs mt-1">{errors.idDocumentNumber.message}</p>}
              </div>
              <div>
                <Label>NIF</Label>
                <Input className="mt-1" {...register('nif')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Telefone</Label>
                <Input className="mt-1" {...register('phone')} />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input type="email" className="mt-1" {...register('email')} />
                {errors.email && <p className="text-alert text-xs mt-1">{errors.email.message}</p>}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="rounded border-input" {...register('whatsappOptIn')} />
              O segurado autoriza receber notificações por WhatsApp neste número
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Província</Label>
                <Input className="mt-1" {...register('province')} />
              </div>
              <div>
                <Label>Município</Label>
                <Input className="mt-1" {...register('municipality')} />
              </div>
            </div>
            <div>
              <Label>Endereço</Label>
              <Input className="mt-1" {...register('address')} />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Criar Segurado'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DependentsDialog({ insured, onClose }: { insured: InsuredMember | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ relationship: 'child', fullName: '', birthDate: '', sex: 'M' });

  // Vai sempre buscar os dados mais recentes do segurado (em vez de usar a
  // instantânea da linha da tabela), para que a lista de dependentes reflicta
  // imediatamente inclusões/exclusões feitas neste diálogo.
  const { data: freshInsured } = useQuery({
    queryKey: ['insured-detail', insured?.id],
    queryFn: () => getInsured(insured!.id),
    enabled: !!insured,
    initialData: insured || undefined,
  });

  const addMutation = useMutation({
    mutationFn: () => addDependent(insured!.id, form),
    onSuccess: () => {
      toast.success('Dependente incluído com sucesso.');
      queryClient.invalidateQueries({ queryKey: ['insured'] });
      queryClient.invalidateQueries({ queryKey: ['insured-detail', insured?.id] });
      setForm({ relationship: 'child', fullName: '', birthDate: '', sex: 'M' });
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const removeMutation = useMutation({
    mutationFn: removeDependent,
    onSuccess: () => {
      toast.success('Dependente excluído.');
      queryClient.invalidateQueries({ queryKey: ['insured'] });
      queryClient.invalidateQueries({ queryKey: ['insured-detail', insured?.id] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  if (!insured) return null;
  const dependents = freshInsured?.dependents || insured.dependents;

  return (
    <Dialog open={!!insured} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Dependentes — {insured.fullName}</DialogTitle></DialogHeader>
        <DialogBody className="space-y-4">
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {dependents.length === 0 && <p className="text-sm text-text-secondary">Nenhum dependente associado.</p>}
            {dependents.map((dep) => (
              <div key={dep.id} className="flex items-center justify-between text-sm border-b pb-2">
                <span>{dep.fullName} <span className="text-text-secondary">({dep.relationship})</span></span>
                <button
                  onClick={() => {
                    if (window.confirm(`Excluir o dependente "${dep.fullName}"?`)) removeMutation.mutate(dep.id);
                  }}
                  className="text-alert p-1 rounded hover:bg-alert/10"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); addMutation.mutate(); }}
            className="grid grid-cols-2 gap-3 border-t pt-4"
          >
            <div className="col-span-2">
              <Label>Nome completo</Label>
              <Input
                required className="mt-1" value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              />
            </div>
            <div>
              <Label>Relação</Label>
              <Select className="mt-1" value={form.relationship} onChange={(e) => setForm((f) => ({ ...f, relationship: e.target.value }))}>
                <option value="spouse">Cônjuge</option>
                <option value="child">Filho(a)</option>
                <option value="parent">Pai/Mãe</option>
                <option value="sibling">Irmão/Irmã</option>
                <option value="other">Outro</option>
              </Select>
            </div>
            <div>
              <Label>Data de nascimento</Label>
              <Input required type="date" className="mt-1" value={form.birthDate} onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <Button type="submit" size="sm" disabled={addMutation.isPending}>
                <UserPlus2 size={14} className="mr-1.5" /> Incluir Dependente
              </Button>
            </div>
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

export default function InsuredPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [dependentsFor, setDependentsFor] = useState<InsuredMember | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['insured', search, status, page],
    queryFn: () => listInsured({ search: search || undefined, status: status || undefined, page, pageSize: 10 }),
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['insured'] });
  }

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => setInsuredStatus(id, status),
    onSuccess: () => { toast.success('Estado do segurado actualizado.'); invalidate(); },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteInsured,
    onSuccess: () => { toast.success('Segurado eliminado.'); invalidate(); },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const issueCardMutation = useMutation({
    mutationFn: issueCard,
    onSuccess: (card) => toast.success(`Cartão ${card.cardNumber} emitido com sucesso.`),
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Segurados</h1>
          <p className="text-text-secondary text-sm">Cadastro e gestão do agregado de segurados.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus size={16} className="mr-1.5" /> Novo Segurado</Button>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-2.5 text-text-secondary" />
          <Input className="pl-9" placeholder="Pesquisar por nome, nº interno, BI ou NIF…"
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-56">
          <option value="">Todos os estados</option>
          {Object.entries(STATUS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </Select>
      </div>

      <div className="bg-card rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface text-text-secondary text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Nº Interno</th>
              <th className="text-left px-4 py-3">Nome</th>
              <th className="text-left px-4 py-3">Dependentes</th>
              <th className="text-left px-4 py-3">Estado</th>
              <th className="text-left px-4 py-3">Acções</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading && <tr><td colSpan={5} className="text-center py-6 text-text-secondary">A carregar…</td></tr>}
            {!isLoading && data?.items.length === 0 && (
              <tr><td colSpan={5} className="text-center py-6 text-text-secondary">Nenhum segurado encontrado.</td></tr>
            )}
            {data?.items.map((item) => (
              <tr key={item.id} className="hover:bg-surface/60">
                <td className="px-4 py-3 font-mono text-xs">{item.internalNumber}</td>
                <td className="px-4 py-3 font-medium text-text-primary">{item.fullName}</td>
                <td className="px-4 py-3 text-text-secondary">
                  <button onClick={() => setDependentsFor(item)} className="hover:underline text-institutional">
                    {item.dependents.length} dependente(s)
                  </button>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_VARIANT[item.status]}>{STATUS_LABELS[item.status] || item.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                      <button className="p-1.5 rounded hover:bg-muted text-text-secondary"><MoreVertical size={16} /></button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content align="end" className="z-50 w-52 rounded-md border bg-card p-1 shadow-lg text-sm">
                        {item.status !== 'active' && (
                          <DropdownMenu.Item onSelect={() => statusMutation.mutate({ id: item.id, status: 'active' })} className="px-2 py-2 rounded-sm cursor-pointer hover:bg-muted">
                            Activar
                          </DropdownMenu.Item>
                        )}
                        {item.status !== 'suspended' && (
                          <DropdownMenu.Item onSelect={() => statusMutation.mutate({ id: item.id, status: 'suspended' })} className="px-2 py-2 rounded-sm cursor-pointer hover:bg-muted">
                            Suspender
                          </DropdownMenu.Item>
                        )}
                        <DropdownMenu.Item onSelect={() => setDependentsFor(item)} className="px-2 py-2 rounded-sm cursor-pointer hover:bg-muted">
                          Gerir dependentes
                        </DropdownMenu.Item>
                        <DropdownMenu.Item onSelect={() => issueCardMutation.mutate(item.id)} className="px-2 py-2 rounded-sm cursor-pointer hover:bg-muted flex items-center gap-2">
                          <CreditCard size={14} /> Emitir cartão
                        </DropdownMenu.Item>
                        {item.phone && (
                          <DropdownMenu.Item
                            onSelect={() => openWhatsApp(item.phone!, `Olá ${item.fullName}, fala da EMIR SAÚDE SEGUROS.`)}
                            className="px-2 py-2 rounded-sm cursor-pointer hover:bg-muted flex items-center gap-2"
                          >
                            <MessageCircle size={14} /> Contactar via WhatsApp
                          </DropdownMenu.Item>
                        )}
                        <DropdownMenu.Separator className="my-1 h-px bg-border" />
                        <DropdownMenu.Item
                          onSelect={() => {
                            if (window.confirm(`Eliminar o segurado "${item.fullName}"?`)) deleteMutation.mutate(item.id);
                          }}
                          className="px-2 py-2 rounded-sm cursor-pointer text-alert hover:bg-alert/10"
                        >
                          Eliminar
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

      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-text-secondary">
          <span>Página {data.meta.page} de {data.meta.totalPages} · {data.meta.totalItems} segurados</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
            <Button variant="outline" size="sm" disabled={page >= data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>Seguinte</Button>
          </div>
        </div>
      )}

      <CreateInsuredDialog open={showCreate} onClose={() => setShowCreate(false)} />
      <DependentsDialog insured={dependentsFor} onClose={() => setDependentsFor(null)} />
    </div>
  );
}
