// Interface do serviço de e-mail (secção 7 do briefing).
//
// Sem SMTP_HOST configurado, usa-se a implementação de desenvolvimento
// (DevEmailService), que apenas regista o conteúdo no terminal do backend.
// Com SMTP_HOST configurado, usa-se a implementação real (NodemailerEmailService).
// Nenhum serviço consumidor precisa de saber qual das duas está activa.
export interface EmailService {
  sendPasswordReset(to: string, fullName: string, resetToken: string): Promise<void>;

  // Notificações de decisão (secção 32, regra "decisões devem notificar o
  // segurado"). Nunca bloqueiam o fluxo principal se o envio falhar — os
  // serviços chamadores devem tratar erros de envio como não-críticos.
  sendClaimDecisionNotification(to: string, fullName: string, claimNumber: string, status: string): Promise<void>;
  sendReimbursementDecisionNotification(to: string, fullName: string, reimbursementNumber: string, status: string): Promise<void>;
  sendAuthorizationDecisionNotification(to: string, fullName: string, requestNumber: string, status: string): Promise<void>;
  sendOverduePremiumNotification(to: string, fullName: string, dueDate: Date, value: number): Promise<void>;
  sendPolicyRenewalReminder(to: string, fullName: string, policyNumber: string, endDate: Date, daysRemaining: number): Promise<void>;

  // Alerta ao dono da plataforma sempre que uma nova empresa se auto-regista
  // publicamente, para nunca ficar sem saber quem está a usar o sistema.
  sendNewOrganizationSelfSignupAlert(to: string, organizationName: string, adminEmail: string): Promise<void>;
}

export const EMAIL_SERVICE = 'EMAIL_SERVICE';
