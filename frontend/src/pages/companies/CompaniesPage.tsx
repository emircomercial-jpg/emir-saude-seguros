import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Building2, Search, MoreVertical, Loader2 } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { listCompanies, createCompany, setCompanyStatus, deleteCompany } from '@/services/companyService';
import { listPlans } from '@/services/planService';
import { createCompanySchema, type CreateCompanyFormValues } from '@/schemas/companySchema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { getApiErrorMessage } from '@/services/apiClient';
import { toast } from '@/stores/toastStore';

const STATUS_VARIANT: Record<string, any> = { active: 'success', suspended: 'warning', cancelled: 'destructive' };
const STATUS_LABELS: Record<string, string> = { active: 'Activa', suspended: 'Suspensa', cancelled: 'Cancelada' };

function CreateCompanyDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: plans } = useQuery({ queryKey: ['plans'], queryFn: listPlans, enabled: open });
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateCompanyFormValues>({
    resolver: zodResolver(createCompanySchema),
  });

  const mutation = useMutation({
    mutationFn: (v: CreateCompanyFormValues) => createCompany({
      ...v,
      email: v.email || undefined,
      planId: v.planId || undefined,
      monthlyValue: v.monthlyValue ? Number(v.monthlyValue) : undefined,
    }),
    onSuccess: () => {
      toast.success('Empresa criada com sucesso.');
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      reset();
      onClose();
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova Empresa Cliente</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))}>
          <DialogBody className="space-y-3">
            <div>
              <Label>Razão social</Label>
              <Input className="mt-1" {...register('legalName')} />
              {errors.legalName && <p className="text-alert text-xs mt-1">{errors.legalName.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nome comercial</Label>
                <Input className="mt-1" {...register('tradeName')} />
              </div>
              <div>
                <Label>NIF</Label>
                <Input className="mt-1" {...register('nif')} />
                {errors.nif && <p className="text-alert text-xs mt-1">{errors.nif.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Sector</Label>
                <Input className="mt-1" {...register('sector')} />
              </div>
              <div>
                <Label>Responsável</Label>
                <Input className="mt-1" {...register('responsibleName')} />
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Plano contratado</Label>
                <Select className="mt-1" {...register('planId')}>
                  <option value="">Seleccionar…</option>
                  {plans?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              </div>
              <div>
                <Label>Valor mensal (Kz)</Label>
                <Input type="number" className="mt-1" {...register('monthlyValue')} />
              </div>
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

export default function CompaniesPage() {
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['companies', search],
    queryFn: () => listCompanies({ search: search || undefined }),
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['companies'] });
  }

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'suspended' | 'cancelled' }) => setCompanyStatus(id, status),
    onSuccess: () => { toast.success('Estado da empresa actualizado.'); invalidate(); },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCompany,
    onSuccess: () => { toast.success('Empresa eliminada.'); invalidate(); },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Empresas Clientes</h1>
          <p className="text-text-secondary text-sm">Empresas que contratam seguros para os seus trabalhadores.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus size={16} className="mr-1.5" /> Nova Empresa</Button>
      </div>

      <div className="relative max-w-sm mb-4">
        <Search size={16} className="absolute left-3 top-2.5 text-text-secondary" />
        <Input className="pl-9" placeholder="Pesquisar por nome ou NIF…" onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="bg-card rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface text-text-secondary text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Empresa</th>
              <th className="text-left px-4 py-3">NIF</th>
              <th className="text-left px-4 py-3">Plano</th>
              <th className="text-left px-4 py-3">Estado</th>
              <th className="text-left px-4 py-3">Acções</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading && <tr><td colSpan={5} className="text-center py-6 text-text-secondary">A carregar…</td></tr>}
            {!isLoading && data?.items.length === 0 && (
              <tr><td colSpan={5} className="text-center py-6 text-text-secondary">Nenhuma empresa cadastrada.</td></tr>
            )}
            {data?.items.map((c) => (
              <tr key={c.id} className="hover:bg-surface/60">
                <td className="px-4 py-3 font-medium text-text-primary flex items-center gap-2">
                  <Building2 size={14} className="text-text-secondary" /> {c.legalName}
                </td>
                <td className="px-4 py-3 text-text-secondary">{c.nif}</td>
                <td className="px-4 py-3 text-text-secondary">{c.plan?.name || '—'}</td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_VARIANT[c.status]}>{STATUS_LABELS[c.status] || c.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                      <button className="p-1.5 rounded hover:bg-muted text-text-secondary"><MoreVertical size={16} /></button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content align="end" className="z-50 w-48 rounded-md border bg-card p-1 shadow-lg text-sm">
                        {c.status !== 'active' && (
                          <DropdownMenu.Item onSelect={() => statusMutation.mutate({ id: c.id, status: 'active' })} className="px-2 py-2 rounded-sm cursor-pointer hover:bg-muted">
                            Activar
                          </DropdownMenu.Item>
                        )}
                        {c.status !== 'suspended' && (
                          <DropdownMenu.Item onSelect={() => statusMutation.mutate({ id: c.id, status: 'suspended' })} className="px-2 py-2 rounded-sm cursor-pointer hover:bg-muted">
                            Suspender
                          </DropdownMenu.Item>
                        )}
                        <DropdownMenu.Separator className="my-1 h-px bg-border" />
                        <DropdownMenu.Item
                          onSelect={() => {
                            if (window.confirm(`Eliminar a empresa "${c.legalName}"?`)) deleteMutation.mutate(c.id);
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

      <CreateCompanyDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
