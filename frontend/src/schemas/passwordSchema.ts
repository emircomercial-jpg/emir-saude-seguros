import { z } from 'zod';

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Indique a palavra-passe actual.'),
    newPassword: z.string().min(8, 'A nova palavra-passe deve ter pelo menos 8 caracteres.'),
    confirmPassword: z.string().min(1, 'Confirme a nova palavra-passe.'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As palavras-passe não coincidem.',
    path: ['confirmPassword'],
  });
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email('E-mail inválido.'),
});
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
