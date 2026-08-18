// Interface do serviço de notificações por WhatsApp — espelha
// EmailService (src/email/email.service.interface.ts) de propósito, para
// que os serviços de negócio possam notificar por ambos os canais com o
// mesmo padrão.
//
// Sem WHATSAPP_API_TOKEN e WHATSAPP_PHONE_NUMBER_ID configurados, usa-se a
// implementação de desenvolvimento (DevWhatsAppService), que apenas regista
// no terminal. Com essas variáveis configuradas, usa-se a implementação
// real (WhatsAppCloudApiService, via Meta WhatsApp Cloud API).
export interface WhatsAppService {
  sendClaimDecisionNotification(phone: string, fullName: string, claimNumber: string, status: string): Promise<void>;
  sendReimbursementDecisionNotification(phone: string, fullName: string, reimbursementNumber: string, status: string): Promise<void>;
  sendAuthorizationDecisionNotification(phone: string, fullName: string, requestNumber: string, status: string): Promise<void>;
  sendOverduePremiumNotification(phone: string, fullName: string, dueDate: Date, value: number): Promise<void>;
  sendPolicyRenewalReminder(phone: string, fullName: string, policyNumber: string, endDate: Date, daysRemaining: number): Promise<void>;
}

export const WHATSAPP_SERVICE = 'WHATSAPP_SERVICE';
