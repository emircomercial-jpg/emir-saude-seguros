import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Building, Loader2, MoreVertical, Users2, ShieldCheck, FileText, AlertTriangle, Wallet, CheckCircle2 } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  listOrganizations, createOrganization, updateOrganizationStatus, setSubscription, recordSubscriptionPayment,
  type PlatformOrganization,
} from '@/services/platformService';
import { createOrganizationSchema, type CreateOrganizationFormValues } from '@/schemas/organizationSchema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { getApiErrorMessage } from '@/services/apiClient';
import { toast } from '@/stores/toastStore';

// "Plataforma" — visível só para o administrador da plataforma (não para
// Superadministradores normais de cada empresa cliente). Permite criar
// novas empresas clientes (vender o sistema a outros negócios), cada uma
// completamente isolada das restantes, e acompanhar o seu uso.

const STATUS_LABELS: Record<string, string> = { active: 'Activa', suspended: 'Suspensa', inactive: 'Inactiva' };
const STATUS_VARIANT: Record<string, any> = { active: 'success', suspended: 'warning', inactive: 'muted' };

export default function PlatformPage() {
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();

  const { data: organizations, isLoading } = useQuery({ queryKey: ['platform-organizations'], queryFn: listOrganizations });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'suspended' | 'inactive' }) => updateOrganizationStatus(id, status),
    onSuccess: () => { toast.success('Estado da empresa actualizado.'); queryClient.invalidateQueries({ queryKey: ['platform-organizations'] }); },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const paymentMutation = useMutation({
    mutationFn: recordSubscriptionPayment,
    onSuccess: () => { toast.success('Pagamento registado — acesso garantido até ao próximo vencimento.'); queryClient.invalidateQueries({ queryKey: ['platform-organizations'] }); },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const [subscriptionFor, setSubscriptionFor] = useState<PlatformOrganization | null>(null);

  const totalUsers = organizations?.reduce((sum, o) => sum + o.userCount, 0) ?? 0;
  const totalInsured = organizations?.reduce((sum, o) => sum + o.insuredCount, 0) ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-text-primary flex items-center gap-2">
            <Building size={20} /> Plataforma — Empresas Clientes
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Gere todas as empresas que usam o sistema. Cada uma tem os seus próprios dados, completamente isolados das restantes.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus size={16} className="mr-1.5" /> Nova Empresa Cliente</Button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card><CardContent className="pt-5">
          <div className="flex items-center gap-2 text-text-secondary text-sm mb-1"><Building size={15} /> Empresas clientes</div>
          <p className="text-2xl font-semibold text-text-primary">{isLoading ? '—' : organizations?.length ?? 0}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5">
          <div className="flex items-center gap-2 text-text-secondary text-sm mb-1"><Users2 size={15} /> Utilizadores no total</div>
          <p className="text-2xl font-semibold text-text-primary">{isLoading ? '—' : totalUsers}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5">
          <div className="flex items-center gap-2 text-text-secondary text-sm mb-1"><FileText size={15} /> Segurados no total</div>
          <p className="text-2xl font-semibold text-text-primary">{isLoading ? '—' : totalInsured}</p>
        </CardContent></Card>
      </div>

      <div className="bg-card rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-text-secondary">
            <tr>
              <th className="px-4 py-3 font-medium">Empresa</th>
              <th className="px-4 py-3 font-medium">Assinatura</th>
              <th className="px-4 py-3 font-medium">Utilizadores</th>
              <th className="px-4 py-3 font-medium">Segurados</th>
              <th className="px-4 py-3 font-medium">Apólices</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium text-right">Acções</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={7} className="px-4 py-8 text-center text-text-secondary"><Loader2 className="animate-spin inline" size={18} /> A carregar...</td></tr>}
            {!isLoading && (organizations?.length ?? 0) === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-text-secondary">Nenhuma empresa cliente ainda.</td></tr>
            )}
            {organizations?.map((org) => (
              <tr key={org.id} className="border-t">
                <td className="px-4 py-3">
                  {org.name}
                  {org.nif && <span className="text-text-secondary text-xs ml-1">({org.nif})</span>}
                  <div className="text-text-secondary text-xs">{org.email}</div>
                </td>
                <td className="px-4 py-3">
                  {org.subscriptionValue ? (
                    <div className={org.isOverdue ? 'text-alert' : ''}>
                      <div className="font-medium">{Number(org.subscriptionValue).toLocaleString()} Kz/mês</div>
                      <div className="text-xs flex items-center gap-1">
                        {org.isOverdue && <AlertTriangle size={11} />}
                        vence {org.subscriptionNextDueDate ? new Date(org.subscriptionNextDueDate).toLocaleDateString('pt-PT') : '—'}
                      </div>
                    </div>
                  ) : (
                    <span className="text-text-secondary text-xs">Sem assinatura definida</span>
                  )}
                </td>
                <td className="px-4 py-3">{org.userCount}</td>
                <td className="px-4 py-3">{org.insuredCount}</td>
                <td className="px-4 py-3">{org.policyCount}</td>
                <td className="px-4 py-3"><Badge variant={STATUS_VARIANT[org.status]}>{STATUS_LABELS[org.status] || org.status}</Badge></td>
                <td className="px-4 py-3 text-right">
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                      <button className="p-1 hover:bg-muted rounded"><MoreVertical size={16} /></button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content align="end" className="bg-card border rounded-md shadow-lg p-1 text-sm min-w-[180px]">
                        <DropdownMenu.Item onSelect={() => setSubscriptionFor(org)} className="px-2 py-2 rounded-sm cursor-pointer hover:bg-muted flex items-center gap-2">
                          <Wallet size={14} /> Definir assinatura
                        </DropdownMenu.Item>
                        {org.subscriptionValue && (
                          <DropdownMenu.Item onSelect={() => paymentMutation.mutate(org.id)} className="px-2 py-2 rounded-sm cursor-pointer hover:bg-muted flex items-center gap-2">
                            <CheckCircle2 size={14} /> Registar pagamento
                          </DropdownMenu.Item>
                        )}
                        {org.status === 'active' ? (
                          <DropdownMenu.Item onSelect={() => statusMutation.mutate({ id: org.id, status: 'suspended' })} className="px-2 py-2 rounded-sm cursor-pointer hover:bg-muted">
                            Suspender acesso
                          </DropdownMenu.Item>
                        ) : (
                          <DropdownMenu.Item onSelect={() => statusMutation.mutate({ id: org.id, status: 'active' })} className="px-2 py-2 rounded-sm cursor-pointer hover:bg-muted">
                            Reactivar acesso
                          </DropdownMenu.Item>
                        )}
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CreateOrganizationDialog open={showCreate} onClose={() => setShowCreate(false)} />
      <SubscriptionDialog organization={subscriptionFor} onClose={() => setSubscriptionFor(null)} />
    </div>
  );
}

function SubscriptionDialog({ organization, onClose }: { organization: PlatformOrganization | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState('');
  const [dueDate, setDueDate] = useState('');

  const mutation = useMutation({
    mutationFn: () => setSubscription(organization!.id, Number(value), new Date(dueDate).toISOString()),
    onSuccess: () => {
      toast.success('Assinatura definida com sucesso.');
      queryClient.invalidateQueries({ queryKey: ['platform-organizations'] });
      setValue('');
      setDueDate('');
      onClose();
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  if (!organization) return null;

  return (
    <Dialog open={!!organization} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Wallet size={16} /> Assinatura — {organization.name}</DialogTitle></DialogHeader>
        <DialogBody className="space-y-3">
          <p className="text-xs text-text-secondary bg-muted/50 rounded-md px-3 py-2">
            Se o pagamento não for registado até 5 dias depois do vencimento, o acesso desta empresa é bloqueado automaticamente,
            sem precisares de fazer nada. Assim que registares o pagamento, o acesso volta de imediato.
          </p>
          <div>
            <Label>Valor mensal (Kz)</Label>
            <Input type="number" min="0" className="mt-1" value={value} onChange={(e) => setValue(e.target.value)} />
          </div>
          <div>
            <Label>Próximo vencimento</Label>
            <Input type="date" className="mt-1" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !value || !dueDate}
          >
            {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateOrganizationDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateOrganizationFormValues>({
    resolver: zodResolver(createOrganizationSchema),
  });

  const mutation = useMutation({
    mutationFn: createOrganization,
    onSuccess: (result) => {
      toast.success(`Empresa "${result.organization.name}" criada — já pode entrar com ${result.admin.email}.`);
      queryClient.invalidateQueries({ queryKey: ['platform-organizations'] });
      reset();
      onClose();
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle className="flex items-center gap-2"><ShieldCheck size={16} /> Nova Empresa Cliente</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))}>
          <DialogBody className="space-y-3">
            <p className="text-xs text-text-secondary bg-muted/50 rounded-md px-3 py-2">
              Cria a empresa já pronta a usar: todos os perfis e permissões padrão, e o primeiro utilizador administrador.
            </p>
            <div>
              <Label>Nome comercial</Label>
              <Input className="mt-1" {...register('name')} />
              {errors.name && <p className="text-alert text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nome legal (opcional)</Label>
                <Input className="mt-1" {...register('legalName')} />
              </div>
              <div>
                <Label>NIF (opcional)</Label>
                <Input className="mt-1" {...register('nif')} />
              </div>
            </div>
            <div>
              <Label>Telefone (opcional)</Label>
              <Input className="mt-1" {...register('phone')} />
            </div>
            <div className="border-t pt-3">
              <Label className="text-xs uppercase text-text-secondary">Primeiro administrador desta empresa</Label>
            </div>
            <div>
              <Label>Nome completo</Label>
              <Input className="mt-1" {...register('adminFullName')} />
              {errors.adminFullName && <p className="text-alert text-xs mt-1">{errors.adminFullName.message}</p>}
            </div>
            <div>
              <Label>E-mail</Label>
              <Input type="email" className="mt-1" {...register('adminEmail')} />
              {errors.adminEmail && <p className="text-alert text-xs mt-1">{errors.adminEmail.message}</p>}
            </div>
            <div>
              <Label>Senha inicial</Label>
              <Input type="text" className="mt-1" {...register('adminPassword')} />
              {errors.adminPassword && <p className="text-alert text-xs mt-1">{errors.adminPassword.message}</p>}
              <p className="text-xs text-text-secondary mt-1">Recomenda-se que esta pessoa mude a senha no primeiro acesso.</p>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Criar Empresa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
