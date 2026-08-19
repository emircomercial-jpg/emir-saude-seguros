import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from './email.service.interface';

// Implementação de desenvolvimento: em vez de enviar e-mails reais, mostra
// o conteúdo no terminal do backend. Usada sempre que SMTP_HOST não está
// configurado — nunca falha, nunca bloqueia o fluxo principal.
@Injectable()
export class DevEmailService implements EmailService {
  private readonly logger = new Logger('EmailService (dev)');

  private print(subject: string, to: string, lines: string[]) {
    this.logger.log('===================================================');
    this.logger.log(`Para: ${to}`);
    this.logger.log(`Assunto: ${subject}`);
    lines.forEach((line) => this.logger.log(line));
    this.logger.log('(SMTP_HOST não configurado — e-mail não enviado realmente.)');
    this.logger.log('===================================================');
  }

  async sendPasswordReset(to: string, fullName: string, resetToken: string): Promise<void> {
    this.print('Recuperação de palavra-passe', to, [
      `Olá ${fullName},`,
      `Token de recuperação: ${resetToken}`,
    ]);
  }

  async sendClaimDecisionNotification(to: string, fullName: string, claimNumber: string, status: string): Promise<void> {
    this.print(`Sinistro ${claimNumber} — actualização`, to, [
      `Olá ${fullName},`,
      `O seu sinistro ${claimNumber} foi actualizado para o estado: ${status}.`,
    ]);
  }

  async sendReimbursementDecisionNotification(to: string, fullName: string, reimbursementNumber: string, status: string): Promise<void> {
    this.print(`Reembolso ${reimbursementNumber} — actualização`, to, [
      `Olá ${fullName},`,
      `O seu pedido de reembolso ${reimbursementNumber} foi actualizado para o estado: ${status}.`,
    ]);
  }

  async sendAuthorizationDecisionNotification(to: string, fullName: string, requestNumber: string, status: string): Promise<void> {
    this.print(`Autorização ${requestNumber} — actualização`, to, [
      `Olá ${fullName},`,
      `A sua solicitação de autorização ${requestNumber} foi actualizada para o estado: ${status}.`,
    ]);
  }

  async sendOverduePremiumNotification(to: string, fullName: string, dueDate: Date, value: number): Promise<void> {
    this.print('Mensalidade em atraso', to, [
      `Olá ${fullName},`,
      `A sua mensalidade de ${value.toLocaleString()} Kz, com vencimento em ${dueDate.toLocaleDateString('pt-PT')}, encontra-se em atraso.`,
      'Regularize o pagamento para evitar a suspensão da sua cobertura.',
    ]);
  }

  async sendPolicyRenewalReminder(to: string, fullName: string, policyNumber: string, endDate: Date, daysRemaining: number): Promise<void> {
    this.print(`A sua apólice ${policyNumber} termina em breve`, to, [
      `Olá ${fullName},`,
      `A sua apólice ${policyNumber} termina dentro de ${daysRemaining} dia(s), a ${endDate.toLocaleDateString('pt-PT')}.`,
      'Contacte-nos para renovar e manter a sua cobertura de saúde activa, sem interrupções.',
    ]);
  }

  async sendNewOrganizationSelfSignupAlert(to: string, organizationName: string, adminEmail: string): Promise<void> {
    this.print('Nova empresa registada na plataforma', to, [
      `Uma nova empresa acabou de se registar sozinha: "${organizationName}".`,
      `Administrador inicial: ${adminEmail}`,
      'Consulta a página Plataforma para veres os detalhes e, se necessário, ajustares a assinatura.',
    ]);
  }
}
