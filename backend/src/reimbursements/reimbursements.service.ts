import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EMAIL_SERVICE, EmailService } from '../email/email.service.interface';
import { WHATSAPP_SERVICE, WhatsAppService } from '../whatsapp/whatsapp.service.interface';
import { CreateReimbursementDto } from './dto/create-reimbursement.dto';
import { UpdateReimbursementStatusDto } from './dto/update-reimbursement-status.dto';

// Reembolsos solicitados pelo segurado (secção 19 do briefing original).
// Calcula automaticamente o valor elegível com base na cobertura do plano
// activo (percentagem coberta e franquia), obtido através da apólice em que
// o segurado é beneficiário.
@Injectable()
export class ReimbursementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    @Inject(EMAIL_SERVICE) private readonly emailService: EmailService,
    @Inject(WHATSAPP_SERVICE) private readonly whatsAppService: WhatsAppService,
  ) {}

  private async generateReimbursementNumber(organizationId: string): Promise<string> {
    const count = await this.prisma.reimbursement.count({ where: { organizationId } });
    const year = new Date().getFullYear();
    return `REEMB-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  private async findActivePlan(insuredMemberId: string) {
    const policyMember = await this.prisma.policyMember.findFirst({
      where: { insuredMemberId, policy: { status: 'active', deletedAt: null } },
      include: { policy: { include: { plan: true } } },
      orderBy: { id: 'desc' },
    });
    return policyMember?.policy.plan ?? null;
  }

  async create(organizationId: string, dto: CreateReimbursementDto, createdBy: string) {
    const insured = await this.prisma.insuredMember.findFirst({
      where: { id: dto.insuredMemberId, organizationId, deletedAt: null },
    });
    if (!insured) throw new NotFoundException('Segurado não encontrado.');

    const reimbursementNumber = await this.generateReimbursementNumber(organizationId);
    const plan = await this.findActivePlan(dto.insuredMemberId);

    // Cálculo automático do valor elegível: percentagem coberta do plano
    // (100% menos a percentagem de copagamento) aplicada ao valor pedido,
    // após deduzir a franquia.
    const coveredPercentage = plan?.copaymentPercentage ? 100 - Number(plan.copaymentPercentage) : 100;
    const deductible = Number(plan?.deductible || 0);
    const eligibleValue = Math.max(dto.requestedValue - deductible, 0) * (coveredPercentage / 100);
    const copayment = dto.requestedValue - eligibleValue;

    const reimbursement = await this.prisma.reimbursement.create({
      data: {
        organizationId,
        reimbursementNumber,
        insuredMemberId: dto.insuredMemberId,
        description: dto.description,
        requestedValue: dto.requestedValue,
        bankDetails: dto.bankDetails,
        eligibleValue,
        deductible,
        copayment,
        finalValue: eligibleValue,
        createdBy,
      },
    });

    await this.auditService.log({
      organizationId,
      userId: createdBy,
      action: 'reimbursement.create',
      module: 'reimbursements',
      entity: 'Reimbursement',
      entityId: reimbursement.id,
      description: `Reembolso "${reimbursement.reimbursementNumber}" submetido para "${insured.fullName}".`,
    });

    return reimbursement;
  }

  async findAll(organizationId: string, status?: string) {
    return this.prisma.reimbursement.findMany({
      where: { organizationId, status: status || undefined },
      include: { insuredMember: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    const reimbursement = await this.prisma.reimbursement.findFirst({
      where: { id, organizationId },
      include: { insuredMember: true },
    });
    if (!reimbursement) throw new NotFoundException('Reembolso não encontrado.');
    return reimbursement;
  }

  async updateStatus(id: string, organizationId: string, dto: UpdateReimbursementStatusDto, updatedBy: string) {
    const existing = await this.findOne(id, organizationId);

    const reimbursement = await this.prisma.reimbursement.update({
      where: { id },
      data: { status: dto.status, updatedBy },
    });

    await this.auditService.log({
      organizationId,
      userId: updatedBy,
      action: 'reimbursement.status_update',
      module: 'reimbursements',
      entity: 'Reimbursement',
      entityId: id,
      description: `Estado do reembolso "${existing.reimbursementNumber}" alterado para "${dto.status}".`,
    });

    if (existing.insuredMember.email) {
      try {
        await this.emailService.sendReimbursementDecisionNotification(
          existing.insuredMember.email, existing.insuredMember.fullName, existing.reimbursementNumber, dto.status,
        );
      } catch {
        // Falha de envio não deve reverter nem bloquear a decisão já registada.
      }
    }

    if (existing.insuredMember.whatsappOptIn && existing.insuredMember.phone) {
      try {
        await this.whatsAppService.sendReimbursementDecisionNotification(
          existing.insuredMember.phone, existing.insuredMember.fullName, existing.reimbursementNumber, dto.status,
        );
      } catch {
        // Falha de envio não deve reverter nem bloquear a decisão já registada.
      }
    }

    return reimbursement;
  }
}
