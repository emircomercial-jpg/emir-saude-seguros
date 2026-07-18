import { z } from 'zod';

export const createCompanySchema = z.object({
  legalName: z.string().min(2, 'A razão social deve ter pelo menos 2 caracteres.'),
  tradeName: z.string().optional(),
  nif: z.string().min(3, 'Indique o NIF.'),
  sector: z.string().optional(),
  responsibleName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('E-mail inválido.').optional().or(z.literal('')),
  planId: z.string().optional(),
  monthlyValue: z.coerce.number().nonnegative().optional().or(z.literal('' as any)),
});
export type CreateCompanyFormValues = z.infer<typeof createCompanySchema>;
