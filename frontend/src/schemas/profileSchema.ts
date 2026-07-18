import { z } from 'zod';

export const updateProfileSchema = z.object({
  fullName: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres.'),
  phone: z.string().optional(),
});
export type UpdateProfileFormValues = z.infer<typeof updateProfileSchema>;
