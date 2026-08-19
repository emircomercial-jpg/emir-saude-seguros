import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ShieldCheck, Building2, Users2, FileHeart, Wallet, Loader2, CheckCircle2 } from 'lucide-react';
import { submitSignup } from '@/services/publicSignupService';
import { getApiErrorMessage } from '@/services/apiClient';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

// Página pública — qualquer empresa interessada em usar o sistema pode
// registar-se sozinha aqui, sem precisar de contactar ninguém primeiro.
// Fica com acesso imediato, como Superadministrador da sua própria
// organização, totalmente isolada de todas as outras empresas.

const signupSchema = z.object({
  name: z.string().min(2, 'Indique o nome da sua empresa.'),
  legalName: z.string().optional(),
  nif: z.string().optional(),
  phone: z.string().optional(),
  adminFullName: z.string().min(2, 'Indique o seu nome.'),
  adminEmail: z.string().email('E-mail inválido.'),
  adminPassword: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres.'),
});
type SignupFormValues = z.infer<typeof signupSchema>;

const FEATURES = [
  { icon: Users2, label: 'Gestão completa de segurados, dependentes e apólices' },
  { icon: FileHeart, label: 'Sinistros, reembolsos e autorizações, com histórico completo' },
  { icon: Wallet, label: 'Facturação, pagamentos e relatórios financeiros' },
  { icon: ShieldCheck, label: 'Portal próprio para os teus clientes acompanharem tudo' },
];

export default function SignupPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
  });
  const [result, setResult] = useState<{ organization: { name: string }; admin: { email: string } } | null>(null);

  const mutation = useMutation({
    mutationFn: submitSignup,
    onSuccess: setResult,
  });

  if (result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-institutional/5 p-4">
        <div className="bg-card rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <CheckCircle2 className="mx-auto text-vital mb-4" size={48} />
          <h1 className="text-xl font-semibold text-text-primary mb-2">Conta criada com sucesso!</h1>
          <p className="text-text-secondary text-sm mb-6">
            A empresa <strong>{result.organization.name}</strong> já está pronta a usar. Entra com o e-mail{' '}
            <strong>{result.admin.email}</strong> e a senha que definiste.
          </p>
          <Link to="/login">
            <Button className="w-full">Entrar agora</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-institutional/5 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full grid md:grid-cols-2 gap-8 items-start">
        <div className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="text-institutional" size={28} />
            <h1 className="text-xl font-semibold text-text-primary">EMIR SAÚDE SEGUROS</h1>
          </div>
          <p className="text-text-secondary mb-6">
            O sistema completo de gestão de seguros de saúde, pronto a usar na tua própria empresa, hoje mesmo.
          </p>
          <ul className="space-y-3">
            {FEATURES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-start gap-2.5 text-sm text-text-primary">
                <Icon size={18} className="text-institutional shrink-0 mt-0.5" />
                {label}
              </li>
            ))}
          </ul>
          <p className="text-xs text-text-secondary mt-6">
            Já tens conta? <Link to="/login" className="text-institutional underline">Entra aqui</Link>.
          </p>
        </div>

        <div className="bg-card rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={18} /> <h2 className="font-medium text-text-primary">Regista a tua empresa</h2>
          </div>
          <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-3">
            <div>
              <Label>Nome da empresa</Label>
              <Input className="mt-1" {...register('name')} />
              {errors.name && <p className="text-alert text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>NIF (opcional)</Label>
                <Input className="mt-1" {...register('nif')} />
              </div>
              <div>
                <Label>Telefone (opcional)</Label>
                <Input className="mt-1" {...register('phone')} />
              </div>
            </div>
            <div className="border-t pt-3">
              <Label>O teu nome</Label>
              <Input className="mt-1" {...register('adminFullName')} />
              {errors.adminFullName && <p className="text-alert text-xs mt-1">{errors.adminFullName.message}</p>}
            </div>
            <div>
              <Label>O teu e-mail</Label>
              <Input type="email" className="mt-1" {...register('adminEmail')} />
              {errors.adminEmail && <p className="text-alert text-xs mt-1">{errors.adminEmail.message}</p>}
            </div>
            <div>
              <Label>Cria uma senha</Label>
              <Input type="password" className="mt-1" {...register('adminPassword')} />
              {errors.adminPassword && <p className="text-alert text-xs mt-1">{errors.adminPassword.message}</p>}
            </div>
            {mutation.isError && (
              <p className="text-alert text-sm bg-alert/10 rounded-md px-3 py-2">{getApiErrorMessage(mutation.error)}</p>
            )}
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 size={16} className="animate-spin mr-1.5" /> : null}
              Criar a minha conta
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
