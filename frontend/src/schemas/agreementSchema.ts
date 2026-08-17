import { z } from 'zod';

export const createAgreementSchema = z.object({
  agencyName: z.string().min(2, 'Indique o nome da seguradora parceira.'),
  agencyNif: z.string().optional(),
  agreementType: z.enum(['reciprocal_coverage', 'reinsurance', 'referral', 'co_insurance', 'other']),
  contactName: z.string().optional(),
  contactEmail: z.string().email('E-mail inválido.').optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  startDate: z.string().min(1, 'Indique a data de início.'),
  endDate: z.string().optional(),
  scope: z.string().optional(),
  notes: z.string().optional(),
});
export type CreateAgreementFormValues = z.infer<typeof createAgreementSchema>;
