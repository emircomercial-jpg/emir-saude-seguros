import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Hospital, Loader2, MessageCircle } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { MoreVertical } from 'lucide-react';
import { listProviders, createProvider, setProviderStatus, deleteProvider } from '@/services/providerService';
import { openWhatsApp } from '@/utils/whatsapp';
import { createProviderSchema, type CreateProviderFormValues } from '@/schemas/providerSchema';
import { ANGOLA_PROVINCES } from '@/constants/angola';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { getApiErrorMessage } from '@/services/apiClient';
import { toast } from '@/stores/toastStore';

const TYPE_LABELS: Record<string, string> = {
  hospital: 'Hospital', clinic: 'Clínica', office: 'Consultório', pharmacy: 'Farmácia',
  laboratory: 'Laboratório', physiotherapy: 'Fisioterapia', dentist: 'Dentista',
  optics: 'Óptica', ambulance: 'Ambulância',
};
const STATUS_LABELS: Record<string, string> = { active: 'Activo', suspended: 'Suspenso', under_review: 'Em revisão' };
const STATUS_VARIANT: Record<string, any> = { active: 'success', suspended: 'warning', under_review: 'default' };

function CreateProviderDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateProviderFormValues>({
    resolver: zodResolver(createProviderSchema),
    defaultValues: { type: 'clinic' },
  });

  const mutation = useMutation({
    mutationFn: (v: CreateProviderFormValues) => createProvider({ ...v, email: v.email || undefined }),
    onSuccess: () => {
      toast.success('Prestador criado com sucesso.');
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      reset();
      onClose();
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo Prestador</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))}>
          <DialogBody className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input className="mt-1" {...register('name')} />
              {errors.name && <p className="text-alert text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>NIF</Label>
                <Input className="mt-1" {...register('nif')} />
                {errors.nif && <p className="text-alert text-xs mt-1">{errors.nif.message}</p>}
              </div>
              <div>
                <Label>Tipo</Label>
                <Select className="mt-1" {...register('type')}>
                  {Object.entries(TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nº de licença</Label>
                <Input className="mt-1" {...register('licenseNumber')} />
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
                <Label>Província</Label>
                <Select className="mt-1" {...register('province')}>
                  <option value="">Escolher...</option>
                  {ANGOLA_PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                </Select>
              </div>
              <div>
                <Label>Município</Label>
                <Input className="mt-1" {...register('municipality')} />
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Criar Prestador'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ProvidersPage() {
  const [type, setType] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();

  const { data: providers, isLoading } = useQuery({
    queryKey: ['providers', type],
    queryFn: () => listProviders({ type: type || undefined }),
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['providers'] });
  }

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'suspended' | 'under_review' }) => setProviderStatus(id, status),
    onSuccess: () => { toast.success('Estado do prestador actualizado.'); invalidate(); },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProvider,
    onSuccess: () => { toast.success('Prestador eliminado.'); invalidate(); },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Prestadores de Saúde</h1>
          <p className="text-text-secondary text-sm">Hospitais, clínicas, farmácias, laboratórios e outros prestadores.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus size={16} className="mr-1.5" /> Novo Prestador</Button>
      </div>

      <Select value={type} onChange={(e) => setType(e.target.value)} className="w-56 mb-4">
        <option value="">Todos os tipos</option>
        {Object.entries(TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </Select>

      <div className="bg-card rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface text-text-secondary text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Prestador</th>
              <th className="text-left px-4 py-3">Tipo</th>
              <th className="text-left px-4 py-3">NIF</th>
              <th className="text-left px-4 py-3">Município</th>
              <th className="text-left px-4 py-3">Estado</th>
              <th className="text-left px-4 py-3">Acções</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading && <tr><td colSpan={6} className="text-center py-6 text-text-secondary">A carregar…</td></tr>}
            {!isLoading && providers?.length === 0 && (
              <tr><td colSpan={6} className="text-center py-6 text-text-secondary">Nenhum prestador cadastrado.</td></tr>
            )}
            {providers?.map((p) => (
              <tr key={p.id} className="hover:bg-surface/60">
                <td className="px-4 py-3 font-medium text-text-primary flex items-center gap-2">
                  <Hospital size={14} className="text-text-secondary" /> {p.name}
                </td>
                <td className="px-4 py-3 text-text-secondary">{TYPE_LABELS[p.type] || p.type}</td>
                <td className="px-4 py-3 text-text-secondary">{p.nif}</td>
                <td className="px-4 py-3 text-text-secondary">{p.municipality || '—'}</td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_VARIANT[p.status]}>{STATUS_LABELS[p.status] || p.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                      <button className="p-1.5 rounded hover:bg-muted text-text-secondary"><MoreVertical size={16} /></button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content align="end" className="z-50 w-48 rounded-md border bg-card p-1 shadow-lg text-sm">
                        {p.status !== 'active' && (
                          <DropdownMenu.Item onSelect={() => statusMutation.mutate({ id: p.id, status: 'active' })} className="px-2 py-2 rounded-sm cursor-pointer hover:bg-muted">
                            Activar
                          </DropdownMenu.Item>
                        )}
                        {p.status !== 'suspended' && (
                          <DropdownMenu.Item onSelect={() => statusMutation.mutate({ id: p.id, status: 'suspended' })} className="px-2 py-2 rounded-sm cursor-pointer hover:bg-muted">
                            Suspender
                          </DropdownMenu.Item>
                        )}
                        {p.phone && (
                          <DropdownMenu.Item
                            onSelect={() => openWhatsApp(p.phone!, `Olá, fala da EMIR SAÚDE SEGUROS, em contacto com ${p.name}.`)}
                            className="px-2 py-2 rounded-sm cursor-pointer hover:bg-muted flex items-center gap-2"
                          >
                            <MessageCircle size={14} /> Contactar via WhatsApp
                          </DropdownMenu.Item>
                        )}
                        <DropdownMenu.Separator className="my-1 h-px bg-border" />
                        <DropdownMenu.Item
                          onSelect={() => {
                            if (window.confirm(`Eliminar o prestador "${p.name}"?`)) deleteMutation.mutate(p.id);
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

      <CreateProviderDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
