import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Monitor, Trash2, LogOut } from 'lucide-react';
import { updateProfileSchema, type UpdateProfileFormValues } from '@/schemas/profileSchema';
import { changePasswordSchema, type ChangePasswordFormValues } from '@/schemas/passwordSchema';
import { updateProfile } from '@/services/profileService';
import { changePassword, listDevices, removeDevice, logoutAll } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/services/apiClient';
import { toast } from '@/stores/toastStore';
import { useNavigate } from 'react-router-dom';

function ProfileForm() {
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const accessToken = useAuthStore((s) => s.accessToken);

  const { register, handleSubmit, formState: { errors } } = useForm<UpdateProfileFormValues>({
    resolver: zodResolver(updateProfileSchema),
    values: { fullName: user?.fullName || '', phone: user?.phone || '' },
  });

  const mutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (updatedUser) => {
      if (accessToken) setAuth(accessToken, updatedUser);
      toast.success('Perfil actualizado com sucesso.');
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  return (
    <Card>
      <CardHeader><CardTitle>Dados Pessoais</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-3 max-w-md">
          <div>
            <Label>Nome completo</Label>
            <Input className="mt-1" {...register('fullName')} />
            {errors.fullName && <p className="text-alert text-xs mt-1">{errors.fullName.message}</p>}
          </div>
          <div>
            <Label>Telefone</Label>
            <Input className="mt-1" {...register('phone')} />
          </div>
          <div>
            <Label>E-mail</Label>
            <Input className="mt-1" value={user?.email || ''} disabled />
            <p className="text-xs text-text-secondary mt-1">O e-mail não pode ser alterado aqui.</p>
          </div>
          <div>
            <Label>Perfis</Label>
            <p className="text-sm text-text-primary mt-1">{user?.roles.map((r) => r.name).join(', ') || '—'}</p>
          </div>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Guardar Alterações'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ChangePasswordForm() {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
  });

  const mutation = useMutation({
    mutationFn: (v: ChangePasswordFormValues) => changePassword(v.currentPassword, v.newPassword),
    onSuccess: (message) => {
      toast.success(message);
      reset();
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  return (
    <Card>
      <CardHeader><CardTitle>Alterar Palavra-passe</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-3 max-w-md">
          <div>
            <Label>Palavra-passe actual</Label>
            <Input type="password" className="mt-1" {...register('currentPassword')} />
            {errors.currentPassword && <p className="text-alert text-xs mt-1">{errors.currentPassword.message}</p>}
          </div>
          <div>
            <Label>Nova palavra-passe</Label>
            <Input type="password" className="mt-1" {...register('newPassword')} />
            {errors.newPassword && <p className="text-alert text-xs mt-1">{errors.newPassword.message}</p>}
          </div>
          <div>
            <Label>Confirmar nova palavra-passe</Label>
            <Input type="password" className="mt-1" {...register('confirmPassword')} />
            {errors.confirmPassword && <p className="text-alert text-xs mt-1">{errors.confirmPassword.message}</p>}
          </div>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Alterar Palavra-passe'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function DevicesSection() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const { data: devices, isLoading } = useQuery({ queryKey: ['my-devices'], queryFn: listDevices });

  const removeMutation = useMutation({
    mutationFn: removeDevice,
    onSuccess: () => {
      toast.success('Dispositivo removido e sessões terminadas.');
      queryClient.invalidateQueries({ queryKey: ['my-devices'] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  async function handleLogoutAll() {
    try {
      await logoutAll();
      toast.success('Sessão terminada em todos os dispositivos.');
    } finally {
      clearAuth();
      navigate('/login');
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Dispositivos</CardTitle></CardHeader>
      <CardContent>
        {isLoading && <p className="text-sm text-text-secondary">A carregar…</p>}
        <div className="space-y-2">
          {devices?.map((device: any) => (
            <div key={device.id} className="flex items-center justify-between text-sm border-b pb-2">
              <div className="flex items-center gap-2">
                <Monitor size={16} className="text-text-secondary" />
                <div>
                  <p className="text-text-primary">{device.deviceName}</p>
                  <p className="text-xs text-text-secondary">
                    {device.lastIpAddress} · {device.lastAccessAt ? new Date(device.lastAccessAt).toLocaleString('pt-PT') : '—'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (window.confirm('Remover este dispositivo? As sessões associadas serão terminadas.')) {
                    removeMutation.mutate(device.id);
                  }
                }}
                className="text-alert hover:bg-alert/10 p-1.5 rounded"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <Button variant="outline" className="mt-4" onClick={handleLogoutAll}>
          <LogOut size={14} className="mr-1.5" /> Terminar sessão em todos os dispositivos
        </Button>
      </CardContent>
    </Card>
  );
}

export default function ProfilePage() {
  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Meu Perfil</h1>
        <p className="text-text-secondary text-sm">Os seus dados pessoais, segurança e dispositivos.</p>
      </div>
      <ProfileForm />
      <ChangePasswordForm />
      <DevicesSection />
    </div>
  );
}
