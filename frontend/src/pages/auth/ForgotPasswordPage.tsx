import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { Loader2, MailCheck } from 'lucide-react';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '@/schemas/passwordSchema';
import { forgotPassword } from '@/services/authService';
import { getApiErrorMessage } from '@/services/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ForgotPasswordPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  async function onSubmit(values: ForgotPasswordFormValues) {
    setError(null);
    setIsSubmitting(true);
    try {
      const message = await forgotPassword(values.email);
      setSentMessage(message);
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
          <h1 className="text-lg font-semibold text-text-primary">Recuperar Palavra-passe</h1>
        </div>

        {sentMessage ? (
          <div className="text-center">
            <MailCheck className="mx-auto mb-3 text-vital" size={32} />
            <p className="text-sm text-text-secondary">{sentMessage}</p>
            <p className="text-xs text-text-secondary mt-3">
              (Ambiente de desenvolvimento: o token de recuperação foi impresso no terminal do backend.)
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" className="mt-1" {...register('email')} />
              {errors.email && <p className="text-alert text-xs mt-1">{errors.email.message}</p>}
            </div>
            {error && <div className="rounded-md bg-alert/10 text-alert text-sm px-3 py-2">{error}</div>}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Enviar instruções'}
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-institutional mt-6">
          <Link to="/login" className="hover:underline">Voltar ao login</Link>
        </p>
      </div>
    </div>
  );
}
