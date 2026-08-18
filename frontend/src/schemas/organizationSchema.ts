import { z } from 'zod';

export const createOrganizationSchema = z.object({
  name: z.string().min(2, 'Indique o nome comercial da empresa.'),
  legalName: z.string().optional(),
  nif: z.string().optional(),
  phone: z.string().optional(),
  adminFullName: z.string().min(2, 'Indique o nome do primeiro administrador.'),
  adminEmail: z.string().email('E-mail inválido.'),
  adminPassword: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres.'),
});
export type CreateOrganizationFormValues = z.infer<typeof createOrganizationSchema>;
