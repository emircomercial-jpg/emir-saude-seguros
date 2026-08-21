import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EMAIL_SERVICE, EmailService } from '../email/email.service.interface';
import { WHATSAPP_SERVICE, WhatsAppService } from '../whatsapp/whatsapp.service.interface';
import { CreateAuthorizationDto } from './dto/create-authorization.dto';
import { DecideAuthorizationDto } from './dto/decide-authorization.dto';

// Fluxo completo de pré-autorização (secção 10 do briefing original).
// Cada mudança de estado fica registada em authorization_history, mantendo
// o histórico integral de todas as decisões — nunca apenas o estado actual.
@Injectable()
export class AuthorizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    @Inject(EMAIL_SERVICE) private readonly emailService: EmailService,
    @Inject(WHATSAPP_SERVICE) private readonly whatsAppService: WhatsAppService,
  ) {}

  private async generateRequestNumber(organizationId: string): Promise<string> {
    const count = await this.prisma.authorization.count({ where: { organizationId } });
    const year = new Date().getFullYear();
    return `AUT-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  async findAll(organizationId: string, filters: { status?: string; insuredMemberId?: string } = {}) {
    return this.prisma.authorization.findMany({
      where: {
        organizationId,
        status: (filters.status as any) || undefined,
        insuredMemberId: filters.insuredMemberId || undefined,
      },
      include: { insuredMember: true, provider: true },
      orderBy: { createdAt: 'desc' },
      take: 1000, // limite de seguranca (auditoria) - evita devolver toda a tabela de uma vez
    });
  }

  async findOne(id: string, organizationId: string) {
    const authorization = await this.prisma.authorization.findFirst({
      where: { id, organizationId },
      include: { insuredMember: true, provider: true, history: { orderBy: { changedAt: 'asc' } } },
    });
    if (!authorization) throw new NotFoundException('Autorização não encontrada.');
    return authorization;
  }

  async create(organizationId: string, dto: CreateAuthorizationDto, createdBy: string) {
    const insured = await this.prisma.insuredMember.findFirst({
      where: { id: dto.insuredMemberId, organizationId, deletedAt: null },
    });
    if (!insured) throw new NotFoundException('Segurado não encontrado.');
    if (insured.status !== 'active') {
      throw new BadRequestException(`Segurado com estado "${insured.status}" não pode solicitar autorização.`);
    }

    const requestNumber = await this.generateRequestNumber(organizationId);

    const authorization = await this.prisma.authorization.create({
      data: { organizationId, requestNumber, ...dto, priority: dto.priority as any, status: 'submitted', createdBy },
    });

    await this.prisma.authorizationHistory.create({
      data: { authorizationId: authorization.id, status: 'submitted', changedBy: createdBy },
    });

    await this.auditService.log({
      organizationId,
      userId: createdBy,
      action: 'authorization.create',
      module: 'authorizations',
      entity: 'Authorization',
      entityId: authorization.id,
      description: `Autorização "${authorization.requestNumber}" submetida para "${insured.fullName}".`,
    });

    return authorization;
  }

  // Decisão sobre a autorização (aprovar, aprovar parcialmente, rejeitar, pedir documentos).
  async decide(id: string, organizationId: string, dto: DecideAuthorizationDto, changedBy: string) {
    const existing = await this.findOne(id, organizationId);

    const authorization = await this.prisma.authorization.update({
      where: { id },
      data: {
        status: dto.status as any,
        decisionNotes: dto.decisionNotes,
        approvedValue: dto.approvedValue,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        updatedBy: changedBy,
      },
    });

    await this.prisma.authorizationHistory.create({
      data: { authorizationId: id, status: dto.status, notes: dto.decisionNotes, changedBy },
    });

    await this.auditService.log({
      organizationId,
      userId: changedBy,
      action: 'authorization.decision',
      module: 'authorizations',
      entity: 'Authorization',
      entityId: id,
      description: `Autorização "${existing.requestNumber}" alterada para "${dto.status}".`,
    });

    if (existing.insuredMember.email) {
      try {
        await this.emailService.sendAuthorizationDecisionNotification(
          existing.insuredMember.email, existing.insuredMember.fullName, existing.requestNumber, dto.status,
        );
      } catch {
        // Falha de envio não deve reverter nem bloquear a decisão já registada.
      }
    }

    if (existing.insuredMember.whatsappOptIn && existing.insuredMember.phone) {
      try {
        await this.whatsAppService.sendAuthorizationDecisionNotification(
          existing.insuredMember.phone, existing.insuredMember.fullName, existing.requestNumber, dto.status,
        );
      } catch {
        // Falha de envio não deve reverter nem bloquear a decisão já registada.
      }
    }

    return authorization;
  }
}
