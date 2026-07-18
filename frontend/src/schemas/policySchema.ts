import { z } from 'zod';

export const createPolicySchema = z.object({
  planId: z.string().min(1, 'Seleccione um plano.'),
  companyId: z.string().optional(),
  issueDate: z.string().min(1, 'Indique a data de emissão.'),
  startDate: z.string().min(1, 'Indique a data de início.'),
  endDate: z.string().min(1, 'Indique a data de vencimento.'),
  value: z.coerce.number().positive('O valor deve ser positivo.'),
  paymentMode: z.string().min(1, 'Indique a modalidade de pagamento.'),
});
export type CreatePolicyFormValues = z.infer<typeof createPolicySchema>;
