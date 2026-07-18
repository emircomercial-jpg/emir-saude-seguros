import { z } from 'zod';

export const createUserSchema = z.object({
  fullName: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres.'),
  email: z.string().email('E-mail inválido.'),
  phone: z.string().optional(),
  temporaryPassword: z.string().min(8, 'A palavra-passe temporária deve ter pelo menos 8 caracteres.'),
  mustChangePassword: z.boolean().optional(),
  roleIds: z.array(z.string()).min(1, 'Seleccione pelo menos um perfil.'),
});
export type CreateUserFormValues = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  fullName: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres.'),
  phone: z.string().optional(),
});
export type UpdateUserFormValues = z.infer<typeof updateUserSchema>;
