import { z } from 'zod';

export const createAuthorizationSchema = z.object({
  insuredMemberId: z.string().min(1, 'Seleccione um segurado.'),
  providerId: z.string().optional(),
  requestingDoctor: z.string().optional(),
  type: z.enum([
    'consulta_especializada', 'exame', 'internamento', 'cirurgia',
    'medicamento_alto_custo', 'tratamento_prolongado', 'fisioterapia',
    'odontologia', 'evacuacao', 'procedimento_especial',
  ]),
  requestedProcedure: z.string().optional(),
  clinicalJustification: z.string().optional(),
  budget: z.coerce.number().nonnegative().optional().or(z.literal('' as any)),
  priority: z.enum(['normal', 'urgent']).optional(),
});
export type CreateAuthorizationFormValues = z.infer<typeof createAuthorizationSchema>;
