import { z } from 'zod';

export const createProviderSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres.'),
  nif: z.string().min(3, 'Indique o NIF.'),
  type: z.enum(['hospital', 'clinic', 'office', 'pharmacy', 'laboratory', 'physiotherapy', 'dentist', 'optics', 'ambulance']),
  licenseNumber: z.string().optional(),
  responsibleName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('E-mail inválido.').optional().or(z.literal('')),
  province: z.string().optional(),
  municipality: z.string().optional(),
});
export type CreateProviderFormValues = z.infer<typeof createProviderSchema>;
