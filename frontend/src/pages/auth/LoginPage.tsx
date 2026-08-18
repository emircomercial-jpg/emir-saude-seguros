import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { loginSchema, type LoginFormValues } from '@/schemas/loginSchema';
import { login } from '@/services/authService';
import { getApiErrorMessage } from '@/services/apiClient';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSlow, setIsSlow] = useState(false);
  const online = navigator.onLine;
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);
    setIsSubmitting(true);
    setIsSlow(false);
    // Se o pedido demorar mais do que uns segundos, é provavelmente o
    // servidor a "acordar" de um período de inactividade (plano
    // gratuito) — não uma falha de ligação. Mostra isso claramente, em
    // vez de deixar a pessoa a pensar que a aplicação travou ou que
    // perdeu a ligação à internet.
    const slowTimer = setTimeout(() => setIsSlow(true), 4000);
    try {
      const result = await login(values.email, values.password);
      setAuth(result.accessToken, result.user);
      // Contas de portal (clientes/segurados ou prestadores) vão para o
      // seu próprio espaço — nunca para a área de gestão administrativa,
      // que nem sequer têm permissões para ver.
      if (result.user.insuredMemberId) navigate('/portal/segurado');
      else if (result.user.providerId) navigate('/portal/prestador');
      else navigate('/dashboard');
    } catch (error) {
      setServerError(getApiErrorMessage(error));
    } finally {
      clearTimeout(slowTimer);
      setIsSubmitting(false);
      setIsSlow(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-institutional px-4">
      <div className="w-full max-w-sm bg-card rounded-lg shadow-xl p-8">
        <div className="flex flex-col items-center mb-6">
          <img src="/logo/logo-full.png" alt="EMIR PHARMA JULIETA LDA" className="w-32 h-auto mb-3" />
          <h1 className="text-xl font-semibold text-text-primary">EMIR SAÚDE SEGUROS</h1>
          <p className="text-text-secondary text-sm text-center mt-1">
            Gestão profissional de seguros de saúde
          </p>
        </div>

        {!online && (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-warning/10 text-warning text-xs px-3 py-2">
            <WifiOff size={14} />
            Sem ligação à internet. O login inicial requer ligação ao servidor.
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="nome@emirsaude.co.ao"
              className="mt-1"
              {...register('email')}
            />
            {errors.email && <p className="text-alert text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Palavra-passe</Label>
              <Link to="/forgot-password" className="text-xs text-institutional hover:underline">
                Esqueceu-se da palavra-passe?
              </Link>
            </div>
            <div className="relative mt-1">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-2.5 text-text-secondary"
                aria-label={showPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p className="text-alert text-xs mt-1">{errors.password.message}</p>}
          </div>

          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input type="checkbox" className="rounded border-input" {...register('rememberMe')} />
            Manter sessão iniciada
          </label>

          {isSlow && (
            <div className="rounded-md bg-institutional/10 text-institutional text-xs px-3 py-2 flex items-center gap-2">
              <Loader2 size={13} className="animate-spin shrink-0" />
              A ligar ao servidor — pode demorar até um minuto se estiver a ser usado pela primeira vez em alguns minutos. Não é uma falha, aguarda um pouco.
            </div>
          )}

          {serverError && (
            <div className="rounded-md bg-alert/10 text-alert text-sm px-3 py-2">{serverError}</div>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting || !online}>
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" /> A entrar…
              </>
            ) : (
              'Entrar'
            )}
          </Button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-text-secondary">
          {online ? <Wifi size={12} className="text-vital" /> : <WifiOff size={12} className="text-alert" />}
          {online ? 'O teu dispositivo tem ligação à internet' : 'O teu dispositivo está sem ligação à internet'}
        </div>

        <p className="text-center text-[11px] text-text-secondary mt-4">
          Acesso restrito a utilizadores autorizados. As suas credenciais são protegidas.
        </p>
      </div>
    </div>
  );
}
