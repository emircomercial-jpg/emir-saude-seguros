import { z } from 'zod';

export const createInsuredSchema = z.object({
  fullName: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres.'),
  birthDate: z.string().min(1, 'Indique a data de nascimento.'),
  sex: z.enum(['M', 'F']),
  idDocumentNumber: z.string().min(3, 'Indique o número do Bilhete de Identidade.'),
  nif: z.string().optional(),
  phone: z.string().optional(),
  whatsappOptIn: z.boolean().optional(),
  email: z.string().email('E-mail inválido.').optional().or(z.literal('')),
  province: z.string().optional(),
  municipality: z.string().optional(),
  address: z.string().optional(),
});
export type CreateInsuredFormValues = z.infer<typeof createInsuredSchema>;
