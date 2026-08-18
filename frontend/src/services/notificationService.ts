import { apiClient } from './apiClient';
import type { ApiSuccessResponse } from '@/types/api';

// Verificação manual de avisos automáticos (lembretes de renovação de
// apólices, mensalidades em atraso) — dispara imediatamente para a
// própria empresa, sem esperar pela verificação diária agendada.
export async function runNotificationChecks() {
  const { data } = await apiClient.post<ApiSuccessResponse<{ renewalRemindersSent: number; overduePremiumRemindersSent: number }>>(
    '/notifications/run-checks',
  );
  return data.data;
}
