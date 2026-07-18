import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'Indique o seu e-mail.').email('E-mail inválido.'),
  password: z.string().min(1, 'Indique a sua palavra-passe.'),
  rememberMe: z.boolean().optional(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
