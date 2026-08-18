import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { WHATSAPP_SERVICE, WhatsAppService } from '../whatsapp/whatsapp.service.interface';
import { EMAIL_SERVICE, EmailService } from '../email/email.service.interface';

// Motor de avisos automáticos — verifica prazos (apólices a terminar,
// mensalidades em atraso) e envia lembretes por e-mail e WhatsApp, sem
// nunca reenviar o mesmo aviso duas vezes (ver NotificationLog).
//
// Enquanto WHATSAPP_API_TOKEN/SMTP_HOST não estiverem configurados, os
// avisos "enviados" ficam apenas registados no terminal do backend
// (DevWhatsAppService/DevEmailService) — o motor de verificação e
// controlo de duplicados funciona da mesma forma em ambos os casos.
const RENEWAL_THRESHOLDS_DAYS = [30, 15, 10, 5, 1];

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(WHATSAPP_SERVICE) private readonly whatsapp: WhatsAppService,
    @Inject(EMAIL_SERVICE) private readonly email: EmailService,
  ) {}

  private async alreadySent(type: string, relatedId: string, channel: 'email' | 'whatsapp'): Promise<boolean> {
    const existing = await this.prisma.notificationLog.findUnique({
      where: { type_relatedId_channel: { type, relatedId, channel } },
    });
    return !!existing;
  }

  private async markSent(organizationId: string, insuredMemberId: string, type: string, relatedId: string, channel: 'email' | 'whatsapp') {
    await this.prisma.notificationLog.create({
      data: { organizationId, insuredMemberId, type, relatedId, channel },
    });
  }

  // Verifica todas as apólices activas de uma organização e envia
  // lembretes de renovação a quem estiver dentro de algum dos limites
  // configurados (30, 15, 10, 5, 1 dias antes do vencimento).
  private async checkPolicyRenewals(organizationId: string) {
    const now = new Date();
    const maxThreshold = Math.max(...RENEWAL_THRESHOLDS_DAYS);
    const horizon = new Date(now);
    horizon.setDate(horizon.getDate() + maxThreshold);

    const policies = await this.prisma.policy.findMany({
      where: {
        organizationId,
        status: 'active',
        deletedAt: null,
        endDate: { gte: now, lte: horizon },
      },
      include: { members: { include: { insuredMember: true } } },
    });

    let sentCount = 0;
    for (const policy of policies) {
      const daysRemaining = Math.ceil((policy.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      // Usa sempre o limite mais próximo já atingido (ex: aos 12 dias,
      // dispara o aviso "10 dias", não o de "15").
      const threshold = RENEWAL_THRESHOLDS_DAYS.filter((t) => daysRemaining <= t).sort((a, b) => a - b)[0];
      if (threshold === undefined) continue;

      const type = `policy_renewal_${threshold}d`;

      for (const member of policy.members) {
        const insured = member.insuredMember;
        if (!insured || insured.deletedAt) continue;

        if (insured.email && !(await this.alreadySent(type, policy.id, 'email'))) {
          try {
            await this.email.sendPolicyRenewalReminder(insured.email, insured.fullName, policy.policyNumber, policy.endDate, daysRemaining);
            await this.markSent(organizationId, insured.id, type, policy.id, 'email');
            sentCount++;
          } catch (error) {
            this.logger.error(`Falha ao enviar lembrete de renovação por e-mail a ${insured.email}: ${(error as Error).message}`);
          }
        }

        // WhatsApp só se o segurado deu consentimento explícito para
        // notificações automáticas por WhatsApp neste número.
        if (insured.phone && insured.whatsappOptIn && !(await this.alreadySent(type, policy.id, 'whatsapp'))) {
          try {
            await this.whatsapp.sendPolicyRenewalReminder(insured.phone, insured.fullName, policy.policyNumber, policy.endDate, daysRemaining);
            await this.markSent(organizationId, insured.id, type, policy.id, 'whatsapp');
            sentCount++;
          } catch (error) {
            this.logger.error(`Falha ao enviar lembrete de renovação por WhatsApp a ${insured.phone}: ${(error as Error).message}`);
          }
        }
      }
    }
    return sentCount;
  }

  // Verifica mensalidades em atraso e avisa cada segurado uma única vez
  // por mensalidade (não repete o aviso todos os dias enquanto continuar
  // em atraso — evita spam).
  private async checkOverduePremiums(organizationId: string) {
    const now = new Date();
    const premiums = await this.prisma.premium.findMany({
      where: {
        organizationId,
        OR: [{ status: 'overdue' }, { status: 'pending', dueDate: { lt: now } }],
      },
      include: { insuredMember: true },
    });

    let sentCount = 0;
    const type = 'premium_overdue';

    for (const premium of premiums) {
      const insured = premium.insuredMember;
      if (!insured || insured.deletedAt) continue;

      if (insured.email && !(await this.alreadySent(type, premium.id, 'email'))) {
        try {
          await this.email.sendOverduePremiumNotification(insured.email, insured.fullName, premium.dueDate, Number(premium.value));
          await this.markSent(organizationId, insured.id, type, premium.id, 'email');
          sentCount++;
        } catch (error) {
          this.logger.error(`Falha ao enviar aviso de atraso por e-mail a ${insured.email}: ${(error as Error).message}`);
        }
      }

      if (insured.phone && insured.whatsappOptIn && !(await this.alreadySent(type, premium.id, 'whatsapp'))) {
        try {
          await this.whatsapp.sendOverduePremiumNotification(insured.phone, insured.fullName, premium.dueDate, Number(premium.value));
          await this.markSent(organizationId, insured.id, type, premium.id, 'whatsapp');
          sentCount++;
        } catch (error) {
          this.logger.error(`Falha ao enviar aviso de atraso por WhatsApp a ${insured.phone}: ${(error as Error).message}`);
        }
      }
    }
    return sentCount;
  }

  // Corre as duas verificações para uma organização — chamado pelo
  // endpoint de verificação manual/agendada.
  async runChecks(organizationId: string) {
    const renewalsSent = await this.checkPolicyRenewals(organizationId);
    const overdueSent = await this.checkOverduePremiums(organizationId);
    return { renewalRemindersSent: renewalsSent, overduePremiumRemindersSent: overdueSent };
  }

  // Corre as verificações para TODAS as organizações activas — usado pelo
  // gatilho externo (cron-job.org ou semelhante), que dispara um único
  // pedido para todo o sistema, em vez de um por empresa.
  async runChecksForAllOrganizations() {
    const organizations = await this.prisma.organization.findMany({ where: { status: 'active' } });
    const results: Record<string, { renewalRemindersSent: number; overduePremiumRemindersSent: number }> = {};
    for (const org of organizations) {
      results[org.name] = await this.runChecks(org.id);
    }
    return results;
  }
}
