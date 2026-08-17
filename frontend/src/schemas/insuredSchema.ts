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
  // Obrigatório: sem plano, não há registo completo (o objectivo deste
  // formulário é sair já com apólice e cartão emitidos).
  planId: z.string().min(1, 'Escolha um plano — é obrigatório para emitir a apólice e o cartão.'),
  dependents: z
    .array(
      z.object({
        relationship: z.enum(['spouse', 'child', 'parent', 'sibling', 'other']),
        fullName: z.string().min(2, 'Indique o nome do dependente.'),
        birthDate: z.string().min(1, 'Indique a data de nascimento do dependente.'),
        sex: z.enum(['M', 'F']),
      }),
    )
    .optional(),
});
export type CreateInsuredFormValues = z.infer<typeof createInsuredSchema>;
