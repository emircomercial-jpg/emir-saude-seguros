import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Shield, Users2, Loader2, Trash2, Settings2 } from 'lucide-react';
import {
  listRoles, createRole, deleteRole, setRoleStatus, assignRolePermissions, type RoleItem,
} from '@/services/roleService';
import { listGroupedPermissions } from '@/services/permissionService';
import { createRoleSchema, type CreateRoleFormValues } from '@/schemas/roleSchema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { getApiErrorMessage } from '@/services/apiClient';
import { toast } from '@/stores/toastStore';

const ACTION_LABELS: Record<string, string> = {
  view: 'Visualizar', create: 'Criar', update: 'Editar', delete: 'Eliminar',
  activate: 'Activar', suspend: 'Suspender', block: 'Bloquear', restore: 'Restaurar',
};

function CreateRoleDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateRoleFormValues>({
    resolver: zodResolver(createRoleSchema),
  });

  const mutation = useMutation({
    mutationFn: createRole,
    onSuccess: () => {
      toast.success('Perfil criado com sucesso.');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      reset();
      onClose();
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo Perfil</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))}>
          <DialogBody className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input className="mt-1" {...register('name')} placeholder="Ex: Gestor Regional" />
              {errors.name && <p className="text-alert text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <Label>Código</Label>
              <Input className="mt-1" {...register('code')} placeholder="Ex: regional_manager" />
              {errors.code && <p className="text-alert text-xs mt-1">{errors.code.message}</p>}
            </div>
            <div>
              <Label>Descrição</Label>
              <Input className="mt-1" {...register('description')} />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Criar Perfil'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PermissionsDialog({ role, onClose }: { role: RoleItem | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: grouped } = useQuery({ queryKey: ['permissions-grouped'], queryFn: listGroupedPermissions, enabled: !!role });
  const [selected, setSelected] = useState<string[]>([]);

  const mutation = useMutation({
    mutationFn: () => assignRolePermissions(role!.id, selected),
    onSuccess: () => {
      toast.success('Permissões do perfil actualizadas.');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      onClose();
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  if (!role) return null;

  return (
    <Dialog
      open={!!role}
      onOpenChange={(v) => {
        if (v) setSelected(role.permissions.map((p) => p.id));
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Matriz de Permissões — {role.name}</DialogTitle>
        </DialogHeader>
        <DialogBody className="max-h-96 overflow-y-auto space-y-4">
          {grouped?.map((group) => (
            <div key={group.module}>
              <p className="text-sm font-medium text-text-primary mb-2 capitalize">{group.module}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {group.permissions.map((perm) => (
                  <label key={perm.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selected.includes(perm.id)}
                      onCheckedChange={(checked) =>
                        setSelected((prev) => (checked ? [...prev, perm.id] : prev.filter((id) => id !== perm.id)))
                      }
                    />
                    {ACTION_LABELS[perm.action] || perm.action}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Guardar Permissões'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function RolesPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [permissionsRole, setPermissionsRole] = useState<RoleItem | null>(null);
  const queryClient = useQueryClient();

  const { data: roles, isLoading } = useQuery({ queryKey: ['roles'], queryFn: listRoles });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['roles'] });
  }

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'inactive' }) => setRoleStatus(id, status),
    onSuccess: () => { toast.success('Estado do perfil actualizado.'); invalidate(); },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRole,
    onSuccess: () => { toast.success('Perfil eliminado.'); invalidate(); },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Perfis e Permissões</h1>
          <p className="text-text-secondary text-sm">Controlo de acesso baseado em perfis (RBAC).</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus size={16} className="mr-1.5" /> Novo Perfil</Button>
      </div>

      {isLoading && <p className="text-text-secondary text-sm">A carregar…</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles?.map((role) => (
          <Card key={role.id}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Shield size={18} className="text-institutional" />
                  <h3 className="font-medium text-text-primary">{role.name}</h3>
                </div>
                {role.isSystem && <Badge variant="muted">Sistema</Badge>}
              </div>
              <p className="text-xs text-text-secondary mb-3">Código: {role.code}</p>
              <div className="flex items-center gap-1.5 text-sm text-text-secondary mb-3">
                <Users2 size={14} /> {role.userCount} utilizador(es)
              </div>
              <div className="flex items-center gap-2 mb-4">
                <Badge variant={role.status === 'active' ? 'success' : 'muted'}>
                  {role.status === 'active' ? 'Activo' : 'Inactivo'}
                </Badge>
                <span className="text-xs text-text-secondary">{role.permissions.length} permissões</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setPermissionsRole(role)}>
                  <Settings2 size={14} className="mr-1" /> Permissões
                </Button>
                {!role.isSystem && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => statusMutation.mutate({ id: role.id, status: role.status === 'active' ? 'inactive' : 'active' })}
                    >
                      {role.status === 'active' ? 'Desactivar' : 'Activar'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-alert hover:bg-alert/10"
                      onClick={() => {
                        if (window.confirm(`Eliminar o perfil "${role.name}"?`)) deleteMutation.mutate(role.id);
                      }}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <CreateRoleDialog open={showCreate} onClose={() => setShowCreate(false)} />
      <PermissionsDialog role={permissionsRole} onClose={() => setPermissionsRole(null)} />
    </div>
  );
}
