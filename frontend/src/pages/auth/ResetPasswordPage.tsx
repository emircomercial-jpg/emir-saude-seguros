import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';
import { resetPassword } from '@/services/authService';
import { getApiErrorMessage } from '@/services/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/stores/toastStore';

const schema = z
  .object({
    token: z.string().min(1, 'Token em falta.'),
    newPassword: z.string().min(8, 'A nova palavra-passe deve ter pelo menos 8 caracteres.'),
    confirmPassword: z.string().min(1),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'As palavras-passe não coincidem.',
    path: ['confirmPassword'],
  });
type FormValues = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { token: searchParams.get('token') || '' },
  });

  async function onSubmit(values: FormValues) {
    setError(null);
    setIsSubmitting(true);
    try {
      await resetPassword(values.token, values.newPassword);
      toast.success('Palavra-passe alterada com sucesso. Inicie sessão.');
      navigate('/login');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-institutional px-4">
      <div className="w-full max-w-sm bg-card rounded-lg shadow-xl p-8">
        <div className="flex flex-col items-center mb-6">
          <img src="/logo/logo-full.png" alt="EMIR PHARMA JULIETA LDA" className="w-28 h-auto mb-3" />
          <h1 className="text-lg font-semibold text-text-primary">Definir Nova Palavra-passe</h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="token">Token de recuperação</Label>
            <Input id="token" className="mt-1" {...register('token')} />
            {errors.token && <p className="text-alert text-xs mt-1">{errors.token.message}</p>}
          </div>
          <div>
            <Label htmlFor="newPassword">Nova palavra-passe</Label>
            <Input id="newPassword" type="password" className="mt-1" {...register('newPassword')} />
            {errors.newPassword && <p className="text-alert text-xs mt-1">{errors.newPassword.message}</p>}
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirmar palavra-passe</Label>
            <Input id="confirmPassword" type="password" className="mt-1" {...register('confirmPassword')} />
            {errors.confirmPassword && <p className="text-alert text-xs mt-1">{errors.confirmPassword.message}</p>}
          </div>

          {error && <div className="rounded-md bg-alert/10 text-alert text-sm px-3 py-2">{error}</div>}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Alterar palavra-passe'}
          </Button>
        </form>

        <p className="text-center text-sm text-institutional mt-6">
          <Link to="/login" className="hover:underline">Voltar ao login</Link>
        </p>
      </div>
    </div>
  );
}
