import { z } from 'zod';

export const createRoleSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres.'),
  code: z
    .string()
    .min(2, 'O código deve ter pelo menos 2 caracteres.')
    .regex(/^[a-z0-9_]+$/, 'Use apenas letras minúsculas, números e underscore.'),
  description: z.string().optional(),
});
export type CreateRoleFormValues = z.infer<typeof createRoleSchema>;
