import { z } from 'zod';

export const createPlanSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres.'),
  code: z.string().min(2, 'O código deve ter pelo menos 2 caracteres.').regex(/^[A-Z0-9-]+$/, 'Use apenas maiúsculas, números e hífen.'),
  description: z.string().optional(),
  monthlyValue: z.coerce.number().positive('O valor mensal deve ser positivo.'),
  annualLimit: z.coerce.number().positive().optional().or(z.literal('' as any)),
  maxDependents: z.coerce.number().int().positive().optional().or(z.literal('' as any)),
  waitingPeriodDays: z.coerce.number().int().nonnegative().optional().or(z.literal('' as any)),
});
export type CreatePlanFormValues = z.infer<typeof createPlanSchema>;
