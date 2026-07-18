import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Plus, Search, MoreVertical, UserCheck, UserX, Lock, RotateCcw, KeyRound,
  History, Monitor, Loader2,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  listUsers, createUser, updateUser, deleteUser, activateUser, suspendUser,
  blockUser, restoreUser, assignUserRoles, resetUserPassword, getUserAuditLogs,
  getUserDevices, linkUserToInsured, linkUserToProvider, type UserListItem,
} from '@/services/userService';
import { listRoles } from '@/services/roleService';
import { createUserSchema, type CreateUserFormValues } from '@/schemas/userSchema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { getApiErrorMessage } from '@/services/apiClient';
import { toast } from '@/stores/toastStore';

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo', suspended: 'Suspenso', blocked: 'Bloqueado', inactive: 'Inactivo',
};
const STATUS_VARIANT: Record<string, any> = {
  active: 'success', suspended: 'warning', blocked: 'destructive', inactive: 'muted',
};

function CreateUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: roles } = useQuery({ queryKey: ['roles-for-select'], queryFn: listRoles, enabled: open });
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { mustChangePassword: true, roleIds: [] },
  });
  const selectedRoleIds = watch('roleIds') || [];

  const mutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      toast.success('Utilizador criado com sucesso.');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      reset();
      onClose();
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  function toggleRole(id: string) {
    const next = selectedRoleIds.includes(id) ? selectedRoleIds.filter((r) => r !== id) : [...selectedRoleIds, id];
    setValue('roleIds', next, { shouldValidate: true });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo Utilizador</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))}>
          <DialogBody className="space-y-3">
            <div>
              <Label>Nome completo</Label>
              <Input className="mt-1" {...register('fullName')} />
              {errors.fullName && <p className="text-alert text-xs mt-1">{errors.fullName.message}</p>}
            </div>
            <div>
              <Label>E-mail</Label>
              <Input type="email" className="mt-1" {...register('email')} />
              {errors.email && <p className="text-alert text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <Label>Telefone</Label>
              <Input className="mt-1" {...register('phone')} />
            </div>
            <div>
              <Label>Palavra-passe temporária</Label>
              <Input type="text" className="mt-1" {...register('temporaryPassword')} />
              {errors.temporaryPassword && <p className="text-alert text-xs mt-1">{errors.temporaryPassword.message}</p>}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" defaultChecked {...register('mustChangePassword')} />
              Obrigar a mudar a palavra-passe no primeiro acesso
            </label>
            <div>
              <Label>Perfis</Label>
              <div className="mt-2 space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                {roles?.map((role) => (
                  <label key={role.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedRoleIds.includes(role.id)}
                      onCheckedChange={() => toggleRole(role.id)}
                    />
                    {role.name}
                  </label>
                ))}
              </div>
              {errors.roleIds && <p className="text-alert text-xs mt-1">{errors.roleIds.message}</p>}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Criar Utilizador'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({ user, onClose }: { user: UserListItem | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset } = useForm({
    values: { fullName: user?.fullName || '', phone: user?.phone || '' },
  });

  const mutation = useMutation({
    mutationFn: (values: { fullName: string; phone: string }) => updateUser(user!.id, values),
    onSuccess: () => {
      toast.success('Utilizador actualizado com sucesso.');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  return (
    <Dialog open={!!user} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Editar Utilizador</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))}>
          <DialogBody className="space-y-3">
            <div>
              <Label>Nome completo</Label>
              <Input className="mt-1" {...register('fullName')} />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input className="mt-1" {...register('phone')} />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AssignRolesDialog({ user, onClose }: { user: UserListItem | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: roles } = useQuery({ queryKey: ['roles-for-select'], queryFn: listRoles, enabled: !!user });
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (user) setSelected(user.roles.map((r) => r.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const mutation = useMutation({
    mutationFn: () => assignUserRoles(user!.id, selected),
    onSuccess: () => {
      toast.success('Perfis do utilizador actualizados.');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  if (!user) return null;

  return (
    <Dialog open={!!user} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Atribuir Perfis — {user.fullName}</DialogTitle></DialogHeader>
        <DialogBody className="space-y-2 max-h-72 overflow-y-auto">
          {roles?.map((role) => (
            <label key={role.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={selected.includes(role.id)}
                onCheckedChange={(checked) =>
                  setSelected((prev) => (checked ? [...prev, role.id] : prev.filter((id) => id !== role.id)))
                }
              />
              {role.name}
            </label>
          ))}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Guardar Perfis'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailsDialog({ userId, mode, onClose }: { userId: string | null; mode: 'audit' | 'devices' | null; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['user-details', userId, mode],
    queryFn: () => (mode === 'audit' ? getUserAuditLogs(userId!) : getUserDevices(userId!)),
    enabled: !!userId && !!mode,
  });

  return (
    <Dialog open={!!userId && !!mode} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'audit' ? 'Histórico de Alterações' : 'Dispositivos'}</DialogTitle>
        </DialogHeader>
        <DialogBody className="max-h-80 overflow-y-auto space-y-2">
          {isLoading && <p className="text-sm text-text-secondary">A carregar…</p>}
          {!isLoading && data?.length === 0 && <p className="text-sm text-text-secondary">Sem registos.</p>}
          {mode === 'audit' && data?.map((log: any) => (
            <div key={log.id} className="text-sm border-b pb-2">
              <p className="text-text-primary">{log.description || log.action}</p>
              <p className="text-xs text-text-secondary">{new Date(log.createdAt).toLocaleString('pt-PT')}</p>
            </div>
          ))}
          {mode === 'devices' && data?.map((device: any) => (
            <div key={device.id} className="text-sm border-b pb-2">
              <p className="text-text-primary">{device.deviceName}</p>
              <p className="text-xs text-text-secondary">
                {device.lastIpAddress} · {device.lastAccessAt ? new Date(device.lastAccessAt).toLocaleString('pt-PT') : '—'}
              </p>
            </div>
          ))}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

export default function UsersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('search') || '';
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null);
  const [assigningUser, setAssigningUser] = useState<UserListItem | null>(null);
  const [detailsUserId, setDetailsUserId] = useState<string | null>(null);
  const [detailsMode, setDetailsMode] = useState<'audit' | 'devices' | null>(null);

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['users', search, status, page],
    queryFn: () => listUsers({ search: search || undefined, status: status || undefined, page, pageSize: 10 }),
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['users'] });
  }

  const activateMutation = useMutation({ mutationFn: activateUser, onSuccess: () => { toast.success('Utilizador activado.'); invalidate(); }, onError: (e) => toast.error(getApiErrorMessage(e)) });
  const suspendMutation = useMutation({ mutationFn: suspendUser, onSuccess: () => { toast.success('Utilizador suspenso.'); invalidate(); }, onError: (e) => toast.error(getApiErrorMessage(e)) });
  const blockMutation = useMutation({ mutationFn: blockUser, onSuccess: () => { toast.success('Utilizador bloqueado.'); invalidate(); }, onError: (e) => toast.error(getApiErrorMessage(e)) });
  const restoreMutation = useMutation({ mutationFn: restoreUser, onSuccess: () => { toast.success('Utilizador restaurado.'); invalidate(); }, onError: (e) => toast.error(getApiErrorMessage(e)) });
  const deleteMutation = useMutation({ mutationFn: deleteUser, onSuccess: () => { toast.success('Utilizador eliminado.'); invalidate(); }, onError: (e) => toast.error(getApiErrorMessage(e)) });
  const resetPasswordMutation = useMutation({
    mutationFn: resetUserPassword,
    onSuccess: (message) => toast.success(message),
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const linkInsuredMutation = useMutation({
    mutationFn: ({ id, insuredMemberId }: { id: string; insuredMemberId: string }) => linkUserToInsured(id, insuredMemberId),
    onSuccess: () => { toast.success('Conta ligada ao portal do segurado.'); invalidate(); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const linkProviderMutation = useMutation({
    mutationFn: ({ id, providerId }: { id: string; providerId: string }) => linkUserToProvider(id, providerId),
    onSuccess: () => { toast.success('Conta ligada ao portal do prestador.'); invalidate(); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Utilizadores</h1>
          <p className="text-text-secondary text-sm">Gestão de contas de acesso ao sistema.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus size={16} className="mr-1.5" /> Novo Utilizador</Button>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-2.5 text-text-secondary" />
          <Input
            className="pl-9"
            defaultValue={search}
            placeholder="Pesquisar por nome ou e-mail…"
            onChange={(e) => {
              setPage(1);
              setSearchParams(e.target.value ? { search: e.target.value } : {});
            }}
          />
        </div>
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-48">
          <option value="">Todos os estados</option>
          {Object.entries(STATUS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </Select>
      </div>

      <div className="bg-card rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface text-text-secondary text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Nome</th>
              <th className="text-left px-4 py-3">E-mail</th>
              <th className="text-left px-4 py-3">Perfis</th>
              <th className="text-left px-4 py-3">Estado</th>
              <th className="text-left px-4 py-3">Último acesso</th>
              <th className="text-left px-4 py-3">Acções</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading && <tr><td colSpan={6} className="text-center py-6 text-text-secondary">A carregar…</td></tr>}
            {!isLoading && data?.items.length === 0 && (
              <tr><td colSpan={6} className="text-center py-6 text-text-secondary">Nenhum utilizador encontrado.</td></tr>
            )}
            {data?.items.map((user) => (
              <tr key={user.id} className="hover:bg-surface/60">
                <td className="px-4 py-3 font-medium text-text-primary">{user.fullName}</td>
                <td className="px-4 py-3 text-text-secondary">{user.email}</td>
                <td className="px-4 py-3 text-text-secondary">{user.roles.map((r) => r.name).join(', ') || '—'}</td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_VARIANT[user.status]}>{STATUS_LABELS[user.status] || user.status}</Badge>
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('pt-PT') : 'Nunca'}
                </td>
                <td className="px-4 py-3">
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                      <button className="p-1.5 rounded hover:bg-muted text-text-secondary"><MoreVertical size={16} /></button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content align="end" className="z-50 w-56 rounded-md border bg-card p-1 shadow-lg text-sm">
                        <DropdownMenu.Item onSelect={() => setEditingUser(user)} className="flex items-center gap-2 px-2 py-2 rounded-sm cursor-pointer hover:bg-muted">
                          Editar dados
                        </DropdownMenu.Item>
                        <DropdownMenu.Item onSelect={() => setAssigningUser(user)} className="flex items-center gap-2 px-2 py-2 rounded-sm cursor-pointer hover:bg-muted">
                          Atribuir perfis
                        </DropdownMenu.Item>
                        <DropdownMenu.Item onSelect={() => resetPasswordMutation.mutate(user.id)} className="flex items-center gap-2 px-2 py-2 rounded-sm cursor-pointer hover:bg-muted">
                          <KeyRound size={14} /> Redefinir palavra-passe
                        </DropdownMenu.Item>
                        <DropdownMenu.Item
                          onSelect={() => {
                            const id = window.prompt('ID do segurado a ligar a esta conta (para acesso ao Portal do Segurado):');
                            if (id) linkInsuredMutation.mutate({ id: user.id, insuredMemberId: id });
                          }}
                          className="flex items-center gap-2 px-2 py-2 rounded-sm cursor-pointer hover:bg-muted"
                        >
                          Ligar ao Portal do Segurado
                        </DropdownMenu.Item>
                        <DropdownMenu.Item
                          onSelect={() => {
                            const id = window.prompt('ID do prestador a ligar a esta conta (para acesso ao Portal do Prestador):');
                            if (id) linkProviderMutation.mutate({ id: user.id, providerId: id });
                          }}
                          className="flex items-center gap-2 px-2 py-2 rounded-sm cursor-pointer hover:bg-muted"
                        >
                          Ligar ao Portal do Prestador
                        </DropdownMenu.Item>
                        <DropdownMenu.Separator className="my-1 h-px bg-border" />
                        {user.status !== 'active' && (
                          <DropdownMenu.Item onSelect={() => activateMutation.mutate(user.id)} className="flex items-center gap-2 px-2 py-2 rounded-sm cursor-pointer hover:bg-muted">
                            <UserCheck size={14} /> Activar
                          </DropdownMenu.Item>
                        )}
                        {user.status !== 'suspended' && (
                          <DropdownMenu.Item onSelect={() => suspendMutation.mutate(user.id)} className="flex items-center gap-2 px-2 py-2 rounded-sm cursor-pointer hover:bg-muted">
                            <UserX size={14} /> Suspender
                          </DropdownMenu.Item>
                        )}
                        {user.status !== 'blocked' && (
                          <DropdownMenu.Item onSelect={() => blockMutation.mutate(user.id)} className="flex items-center gap-2 px-2 py-2 rounded-sm cursor-pointer hover:bg-muted">
                            <Lock size={14} /> Bloquear
                          </DropdownMenu.Item>
                        )}
                        <DropdownMenu.Item onSelect={() => restoreMutation.mutate(user.id)} className="flex items-center gap-2 px-2 py-2 rounded-sm cursor-pointer hover:bg-muted">
                          <RotateCcw size={14} /> Restaurar
                        </DropdownMenu.Item>
                        <DropdownMenu.Separator className="my-1 h-px bg-border" />
                        <DropdownMenu.Item onSelect={() => { setDetailsUserId(user.id); setDetailsMode('audit'); }} className="flex items-center gap-2 px-2 py-2 rounded-sm cursor-pointer hover:bg-muted">
                          <History size={14} /> Histórico
                        </DropdownMenu.Item>
                        <DropdownMenu.Item onSelect={() => { setDetailsUserId(user.id); setDetailsMode('devices'); }} className="flex items-center gap-2 px-2 py-2 rounded-sm cursor-pointer hover:bg-muted">
                          <Monitor size={14} /> Dispositivos
                        </DropdownMenu.Item>
                        <DropdownMenu.Separator className="my-1 h-px bg-border" />
                        <DropdownMenu.Item
                          onSelect={() => {
                            if (window.confirm(`Eliminar o utilizador "${user.fullName}"? Esta acção pode ser revertida através de "Restaurar".`)) {
                              deleteMutation.mutate(user.id);
                            }
                          }}
                          className="flex items-center gap-2 px-2 py-2 rounded-sm cursor-pointer text-alert hover:bg-alert/10"
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
          <span>Página {data.meta.page} de {data.meta.totalPages} · {data.meta.totalItems} utilizadores</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
            <Button variant="outline" size="sm" disabled={page >= data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>Seguinte</Button>
          </div>
        </div>
      )}

      <CreateUserDialog open={showCreate} onClose={() => setShowCreate(false)} />
      <EditUserDialog user={editingUser} onClose={() => setEditingUser(null)} />
      <AssignRolesDialog user={assigningUser} onClose={() => setAssigningUser(null)} />
      <DetailsDialog userId={detailsUserId} mode={detailsMode} onClose={() => { setDetailsUserId(null); setDetailsMode(null); }} />
    </div>
  );
}
