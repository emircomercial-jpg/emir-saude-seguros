import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EMAIL_SERVICE, EmailService } from '../email/email.service.interface';
import { WHATSAPP_SERVICE, WhatsAppService } from '../whatsapp/whatsapp.service.interface';
import { CreatePremiumDto } from './dto/create-premium.dto';
import { RegisterPaymentDto } from './dto/register-payment.dto';

// Pagamentos e mensalidades (secção 16 do briefing original).
// Regra de negócio: nenhum pagamento pode ser eliminado permanentemente
// (secção 32, regra 5 do briefing original) — este serviço não expõe
// nenhuma rota de eliminação.
@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    @Inject(EMAIL_SERVICE) private readonly emailService: EmailService,
    @Inject(WHATSAPP_SERVICE) private readonly whatsAppService: WhatsAppService,
  ) {}

  async createPremium(organizationId: string, dto: CreatePremiumDto, createdBy: string) {
    const premium = await this.prisma.premium.create({
      data: {
        organizationId,
        ...dto,
        referenceMonth: new Date(dto.referenceMonth),
        dueDate: new Date(dto.dueDate),
      },
    });

    await this.auditService.log({
      organizationId,
      userId: createdBy,
      action: 'payments.premium_created',
      module: 'payments',
      entity: 'Premium',
      entityId: premium.id,
      description: `Mensalidade gerada (vencimento: ${dto.dueDate}).`,
    });

    return premium;
  }

  async listPremiums(organizationId: string, filters: { status?: string; insuredMemberId?: string; companyId?: string }) {
    // Detecta atrasos automaticamente (mensalidades vencidas e ainda pendentes).
    await this.prisma.premium.updateMany({
      where: { organizationId, status: 'pending', dueDate: { lt: new Date() } },
      data: { status: 'overdue' },
    });

    return this.prisma.premium.findMany({
      where: {
        organizationId,
        status: filters.status || undefined,
        insuredMemberId: filters.insuredMemberId || undefined,
        companyId: filters.companyId || undefined,
      },
      include: { insuredMember: true, company: true, payments: true },
      orderBy: { dueDate: 'desc' },
      take: 1000, // limite de seguranca (auditoria) - evita devolver toda a tabela de uma vez
    });
  }

  async registerPayment(organizationId: string, dto: RegisterPaymentDto, registeredBy: string) {
    const premium = await this.prisma.premium.findFirst({
      where: { id: dto.premiumId, organizationId },
      include: { payments: true },
    });
    if (!premium) throw new NotFoundException('Mensalidade não encontrada.');

    const alreadyPaid = premium.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalDue = Number(premium.value) + Number(premium.lateFee || 0) - Number(premium.discount || 0);

    if (alreadyPaid + dto.amount > totalDue + 0.01) {
      throw new BadRequestException('O valor pago excede o valor em dívida da mensalidade.');
    }

    const payment = await this.prisma.payment.create({ data: { ...dto, registeredBy } });

    const newTotalPaid = alreadyPaid + dto.amount;
    const newStatus = newTotalPaid >= totalDue ? 'paid' : 'partially_paid';
    await this.prisma.premium.update({ where: { id: dto.premiumId }, data: { status: newStatus } });

    // Reactivação automática do segurado após pagamento, se estava bloqueado por falta de pagamento.
    if (newStatus === 'paid' && premium.insuredMemberId) {
      const insured = await this.prisma.insuredMember.findUnique({ where: { id: premium.insuredMemberId } });
      if (insured?.status === 'blocked_nonpayment') {
        await this.prisma.insuredMember.update({ where: { id: premium.insuredMemberId }, data: { status: 'active' } });
      }
    }

    await this.auditService.log({
      organizationId,
      userId: registeredBy,
      action: 'payments.payment_registered',
      module: 'payments',
      entity: 'Payment',
      entityId: payment.id,
      description: `Pagamento de ${dto.amount} registado para a mensalidade.`,
    });

    return payment;
  }

  // Suspensão automática de segurados com mensalidade vencida há mais de
  // 'graceDays' dias — notifica por e-mail antes de suspender (secção 16).
  async suspendOverdue(organizationId: string, graceDays = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - graceDays);

    const overdue = await this.prisma.premium.findMany({
      where: { organizationId, status: 'overdue', dueDate: { lt: cutoff }, insuredMemberId: { not: null } },
      include: { insuredMember: true },
    });

    for (const premium of overdue) {
      if (premium.insuredMember?.email) {
        try {
          await this.emailService.sendOverduePremiumNotification(
            premium.insuredMember.email, premium.insuredMember.fullName, premium.dueDate, Number(premium.value),
          );
        } catch {
          // Falha de envio não deve interromper a suspensão.
        }
      }

      if (premium.insuredMember?.whatsappOptIn && premium.insuredMember?.phone) {
        try {
          await this.whatsAppService.sendOverduePremiumNotification(
            premium.insuredMember.phone, premium.insuredMember.fullName, premium.dueDate, Number(premium.value),
          );
        } catch {
          // Falha de envio não deve interromper a suspensão.
        }
      }
    }

    const insuredIds = [...new Set(overdue.map((p) => p.insuredMemberId!).filter(Boolean))];
    if (insuredIds.length === 0) return { suspended: 0 };

    await this.prisma.insuredMember.updateMany({
      where: { id: { in: insuredIds }, status: 'active' },
      data: { status: 'blocked_nonpayment' },
    });

    return { suspended: insuredIds.length };
  }

  getStatement(insuredMemberId: string) {
    return this.prisma.premium.findMany({
      where: { insuredMemberId },
      include: { payments: true },
      orderBy: { referenceMonth: 'desc' },
      take: 1000, // limite de seguranca (auditoria) - evita devolver toda a tabela de uma vez
    });
  }
}
