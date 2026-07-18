import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EMAIL_SERVICE, EmailService } from '../email/email.service.interface';
import { WHATSAPP_SERVICE, WhatsAppService } from '../whatsapp/whatsapp.service.interface';
import { CreateClaimDto } from './dto/create-claim.dto';
import { UpdateClaimStatusDto } from './dto/update-claim-status.dto';

// Gestão de sinistros médicos (secção 18 do briefing original): submissão,
// triagem, auditoria clínica/financeira, aprovação/rejeição e encerramento.
@Injectable()
export class ClaimsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    @Inject(EMAIL_SERVICE) private readonly emailService: EmailService,
    @Inject(WHATSAPP_SERVICE) private readonly whatsAppService: WhatsAppService,
  ) {}

  private async generateClaimNumber(organizationId: string): Promise<string> {
    const count = await this.prisma.claim.count({ where: { organizationId } });
    const year = new Date().getFullYear();
    return `SIN-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  async create(organizationId: string, dto: CreateClaimDto, createdBy: string) {
    const insured = await this.prisma.insuredMember.findFirst({
      where: { id: dto.insuredMemberId, organizationId, deletedAt: null },
    });
    if (!insured) throw new NotFoundException('Segurado não encontrado.');

    const claimNumber = await this.generateClaimNumber(organizationId);

    const claim = await this.prisma.claim.create({
      data: {
        organizationId,
        claimNumber,
        ...dto,
        occurrenceDate: dto.occurrenceDate ? new Date(dto.occurrenceDate) : undefined,
        createdBy,
      },
    });

    await this.auditService.log({
      organizationId,
      userId: createdBy,
      action: 'claim.create',
      module: 'claims',
      entity: 'Claim',
      entityId: claim.id,
      description: `Sinistro "${claim.claimNumber}" submetido para "${insured.fullName}".`,
    });

    return claim;
  }

  async findAll(organizationId: string, status?: string) {
    return this.prisma.claim.findMany({
      where: { organizationId, status: status || undefined },
      include: { insuredMember: true, provider: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    const claim = await this.prisma.claim.findFirst({
      where: { id, organizationId },
      include: { insuredMember: true, provider: true, policy: true },
    });
    if (!claim) throw new NotFoundException('Sinistro não encontrado.');
    return claim;
  }

  async updateStatus(id: string, organizationId: string, dto: UpdateClaimStatusDto, updatedBy: string) {
    const existing = await this.findOne(id, organizationId);

    const claim = await this.prisma.claim.update({
      where: { id },
      data: { ...dto, updatedBy },
    });

    await this.auditService.log({
      organizationId,
      userId: updatedBy,
      action: 'claim.status_update',
      module: 'claims',
      entity: 'Claim',
      entityId: id,
      description: `Estado do sinistro "${existing.claimNumber}" alterado para "${dto.status}".`,
    });

    // Notificação por e-mail (nunca bloqueia a decisão se falhar).
    if (existing.insuredMember.email) {
      try {
        await this.emailService.sendClaimDecisionNotification(
          existing.insuredMember.email, existing.insuredMember.fullName, existing.claimNumber, dto.status,
        );
      } catch {
        // Falha de envio não deve reverter nem bloquear a decisão já registada.
      }
    }

    // Notificação por WhatsApp — só se o segurado tiver dado consentimento
    // explícito (whatsappOptIn) e tiver um número registado.
    if (existing.insuredMember.whatsappOptIn && existing.insuredMember.phone) {
      try {
        await this.whatsAppService.sendClaimDecisionNotification(
          existing.insuredMember.phone, existing.insuredMember.fullName, existing.claimNumber, dto.status,
        );
      } catch {
        // Falha de envio não deve reverter nem bloquear a decisão já registada.
      }
    }

    return claim;
  }
}
