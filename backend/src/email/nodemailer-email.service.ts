import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EmailService } from './email.service.interface';

// Implementação real de envio de e-mail (secção 7 do briefing), activada
// automaticamente quando SMTP_HOST está configurado. Falhas de envio nunca
// devem interromper o fluxo de negócio que despoletou a notificação — por
// isso todos os métodos capturam e registam o erro em vez de o propagar.
@Injectable()
export class NodemailerEmailService implements EmailService {
  private readonly logger = new Logger('EmailService (SMTP)');
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;
  private readonly appName: string;
  private readonly appUrl: string;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('email.host'),
      port: this.config.get<number>('email.port'),
      secure: this.config.get<boolean>('email.secure'),
      auth: this.config.get<string>('email.user')
        ? { user: this.config.get<string>('email.user'), pass: this.config.get<string>('email.password') }
        : undefined,
    });
    this.from = this.config.get<string>('email.from') || 'no-reply@emirsaude.co.ao';
    this.appName = this.config.get<string>('app.name') || 'EMIR SAÚDE SEGUROS';
    this.appUrl = this.config.get<string>('app.url') || '';
  }

  private async send(to: string, subject: string, html: string) {
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html });
    } catch (error) {
      // Nunca deixar uma falha de envio de e-mail interromper o fluxo
      // principal (ex: uma decisão de sinistro deve ficar registada mesmo
      // que a notificação por e-mail falhe).
      this.logger.error(`Falha ao enviar e-mail para ${to}: ${(error as Error).message}`);
    }
  }

  private wrap(title: string, bodyHtml: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
        <h2 style="color: #0F4C81;">${this.appName}</h2>
        <h3>${title}</h3>
        ${bodyHtml}
        <p style="font-size: 12px; color: #5F6B76; margin-top: 24px;">
          Este é um e-mail automático — não responda directamente a esta mensagem.
        </p>
      </div>
    `;
  }

  async sendPasswordReset(to: string, fullName: string, resetToken: string): Promise<void> {
    const resetLink = `${this.appUrl}/reset-password?token=${resetToken}`;
    await this.send(
      to,
      'Recuperação de palavra-passe',
      this.wrap('Recuperação de palavra-passe', `
        <p>Olá ${fullName},</p>
        <p>Recebemos um pedido de recuperação de palavra-passe. Use o link abaixo para definir uma nova:</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>Se não foi você a pedir, ignore este e-mail.</p>
      `),
    );
  }

  async sendClaimDecisionNotification(to: string, fullName: string, claimNumber: string, status: string): Promise<void> {
    await this.send(
      to,
      `Sinistro ${claimNumber} — actualização`,
      this.wrap('Actualização do seu sinistro', `
        <p>Olá ${fullName},</p>
        <p>O seu sinistro <strong>${claimNumber}</strong> foi actualizado para o estado: <strong>${status}</strong>.</p>
      `),
    );
  }

  async sendReimbursementDecisionNotification(to: string, fullName: string, reimbursementNumber: string, status: string): Promise<void> {
    await this.send(
      to,
      `Reembolso ${reimbursementNumber} — actualização`,
      this.wrap('Actualização do seu reembolso', `
        <p>Olá ${fullName},</p>
        <p>O seu pedido de reembolso <strong>${reimbursementNumber}</strong> foi actualizado para o estado: <strong>${status}</strong>.</p>
      `),
    );
  }

  async sendAuthorizationDecisionNotification(to: string, fullName: string, requestNumber: string, status: string): Promise<void> {
    await this.send(
      to,
      `Autorização ${requestNumber} — actualização`,
      this.wrap('Actualização da sua autorização', `
        <p>Olá ${fullName},</p>
        <p>A sua solicitação de autorização <strong>${requestNumber}</strong> foi actualizada para o estado: <strong>${status}</strong>.</p>
      `),
    );
  }

  async sendOverduePremiumNotification(to: string, fullName: string, dueDate: Date, value: number): Promise<void> {
    await this.send(
      to,
      'Mensalidade em atraso',
      this.wrap('Mensalidade em atraso', `
        <p>Olá ${fullName},</p>
        <p>A sua mensalidade de <strong>${value.toLocaleString()} Kz</strong>, com vencimento em
        <strong>${dueDate.toLocaleDateString('pt-PT')}</strong>, encontra-se em atraso.</p>
        <p>Regularize o pagamento para evitar a suspensão da sua cobertura.</p>
      `),
    );
  }

  async sendPolicyRenewalReminder(to: string, fullName: string, policyNumber: string, endDate: Date, daysRemaining: number): Promise<void> {
    await this.send(
      to,
      `A sua apólice ${policyNumber} termina em breve`,
      this.wrap('A sua apólice termina em breve', `
        <p>Olá ${fullName},</p>
        <p>A sua apólice <strong>${policyNumber}</strong> termina dentro de
        <strong>${daysRemaining} dia(s)</strong>, a <strong>${endDate.toLocaleDateString('pt-PT')}</strong>.</p>
        <p>Contacte-nos para renovar e manter a sua cobertura de saúde activa, sem interrupções.</p>
      `),
    );
  }
}
