import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { UpdatePolicyDto } from './dto/update-policy.dto';

// Apólices e contratos (secção 7 do briefing original). Numeração automática
// sequencial; renovação e mudança de estado mantêm sempre o histórico via
// auditoria (nunca substituem silenciosamente os dados anteriores).
@Injectable()
export class PoliciesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private async generatePolicyNumber(organizationId: string): Promise<string> {
    const count = await this.prisma.policy.count({ where: { organizationId } });
    const year = new Date().getFullYear();
    return `AP-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  async findAll(organizationId: string, status?: string) {
    return this.prisma.policy.findMany({
      where: { organizationId, deletedAt: null, status: (status as any) || undefined },
      include: { plan: true, company: true, members: { include: { insuredMember: true } } },
      orderBy: { issueDate: 'desc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    const policy = await this.prisma.policy.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { plan: true, company: true, members: { include: { insuredMember: true } } },
    });
    if (!policy) throw new NotFoundException('Apólice não encontrada.');
    return policy;
  }

  async create(organizationId: string, dto: CreatePolicyDto, createdBy: string) {
    const plan = await this.prisma.healthPlan.findFirst({ where: { id: dto.planId, organizationId, deletedAt: null } });
    if (!plan) throw new BadRequestException('Plano não encontrado.');

    if (dto.companyId) {
      const company = await this.prisma.company.findFirst({ where: { id: dto.companyId, organizationId, deletedAt: null } });
      if (!company) throw new BadRequestException('Empresa não encontrada.');
    }

    const policyNumber = await this.generatePolicyNumber(organizationId);
    const { insuredMemberIds, ...rest } = dto;

    const policy = await this.prisma.policy.create({
      data: {
        organizationId,
        policyNumber,
        ...rest,
        issueDate: new Date(dto.issueDate),
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        createdBy,
        members: insuredMemberIds ? { create: insuredMemberIds.map((insuredMemberId) => ({ insuredMemberId })) } : undefined,
      },
      include: { plan: true, company: true, members: { include: { insuredMember: true } } },
    });

    await this.auditService.log({
      organizationId,
      userId: createdBy,
      action: 'policy.create',
      module: 'policies',
      entity: 'Policy',
      entityId: policy.id,
      description: `Apólice "${policy.policyNumber}" emitida.`,
    });

    return policy;
  }

  async update(id: string, organizationId: string, dto: UpdatePolicyDto, updatedBy: string) {
    const existing = await this.findOne(id, organizationId);

    const policy = await this.prisma.policy.update({
      where: { id },
      data: {
        ...dto,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        updatedBy,
      },
      include: { plan: true, company: true, members: { include: { insuredMember: true } } },
    });

    await this.auditService.log({
      organizationId,
      userId: updatedBy,
      action: 'policy.update',
      module: 'policies',
      entity: 'Policy',
      entityId: id,
      description: `Apólice "${existing.policyNumber}" actualizada.`,
    });

    return policy;
  }

  async renew(id: string, organizationId: string, newEndDate: string, updatedBy: string) {
    const existing = await this.findOne(id, organizationId);

    const policy = await this.prisma.policy.update({
      where: { id },
      data: { endDate: new Date(newEndDate), status: 'renewed', updatedBy },
      include: { plan: true, company: true, members: { include: { insuredMember: true } } },
    });

    await this.auditService.log({
      organizationId,
      userId: updatedBy,
      action: 'policy.renew',
      module: 'policies',
      entity: 'Policy',
      entityId: id,
      description: `Apólice "${existing.policyNumber}" renovada até ${newEndDate}.`,
    });

    return policy;
  }

  async setStatus(id: string, organizationId: string, status: string, updatedBy: string) {
    const existing = await this.findOne(id, organizationId);
    const policy = await this.prisma.policy.update({
      where: { id },
      data: { status: status as any, updatedBy },
      include: { plan: true, company: true, members: { include: { insuredMember: true } } },
    });

    await this.auditService.log({
      organizationId,
      userId: updatedBy,
      action: 'policy.status_update',
      module: 'policies',
      entity: 'Policy',
      entityId: id,
      description: `Estado da apólice "${existing.policyNumber}" alterado para "${status}".`,
    });

    return policy;
  }

  async addMember(id: string, organizationId: string, insuredMemberId: string, updatedBy: string) {
    const policy = await this.findOne(id, organizationId);

    const insured = await this.prisma.insuredMember.findFirst({ where: { id: insuredMemberId, organizationId, deletedAt: null } });
    if (!insured) throw new BadRequestException('Segurado não encontrado.');

    await this.prisma.policyMember.create({ data: { policyId: id, insuredMemberId } });

    await this.auditService.log({
      organizationId,
      userId: updatedBy,
      action: 'policy.member_added',
      module: 'policies',
      entity: 'Policy',
      entityId: id,
      description: `Beneficiário "${insured.fullName}" adicionado à apólice "${policy.policyNumber}".`,
    });

    return this.findOne(id, organizationId);
  }

  async removeMember(id: string, organizationId: string, insuredMemberId: string, updatedBy: string) {
    const policy = await this.findOne(id, organizationId);

    await this.prisma.policyMember.deleteMany({ where: { policyId: id, insuredMemberId } });

    await this.auditService.log({
      organizationId,
      userId: updatedBy,
      action: 'policy.member_removed',
      module: 'policies',
      entity: 'Policy',
      entityId: id,
      description: `Beneficiário removido da apólice "${policy.policyNumber}".`,
    });

    return this.findOne(id, organizationId);
  }

  // ---------- Assinatura digital (secção 7 do briefing original) ----------

  // Conteúdo canónico do contrato: qualquer alteração a estes campos depois
  // de assinado muda o hash, permitindo detectar violação da integridade.
  private buildCanonicalContent(policy: {
    policyNumber: string; planId: string; companyId: string | null;
    startDate: Date; endDate: Date; value: unknown; paymentMode: string;
  }): string {
    return [
      policy.policyNumber,
      policy.planId,
      policy.companyId || 'individual',
      policy.startDate.toISOString(),
      policy.endDate.toISOString(),
      String(policy.value),
      policy.paymentMode,
    ].join('|');
  }

  async sign(id: string, organizationId: string, signedByName: string, signatureIp: string | undefined, signedBy: string) {
    const policy = await this.findOne(id, organizationId);
    if (policy.signatureHash) throw new BadRequestException('Esta apólice já foi assinada.');

    const content = this.buildCanonicalContent(policy);
    const signatureHash = crypto.createHash('sha256').update(content).digest('hex');

    const updated = await this.prisma.policy.update({
      where: { id },
      data: { signatureHash, signedAt: new Date(), signedByName, signatureIp, updatedBy: signedBy },
      include: { plan: true, company: true, members: { include: { insuredMember: true } } },
    });

    await this.auditService.log({
      organizationId,
      userId: signedBy,
      action: 'policy.signed',
      module: 'policies',
      entity: 'Policy',
      entityId: id,
      description: `Apólice "${policy.policyNumber}" assinada digitalmente por "${signedByName}".`,
    });

    return updated;
  }

  // Recalcula o hash a partir dos dados actuais e compara com o assinado —
  // detecta qualquer alteração posterior à assinatura.
  async verifySignature(id: string, organizationId: string) {
    const policy = await this.findOne(id, organizationId);
    if (!policy.signatureHash) return { signed: false, valid: false };

    const currentHash = crypto.createHash('sha256').update(this.buildCanonicalContent(policy)).digest('hex');
    return {
      signed: true,
      valid: currentHash === policy.signatureHash,
      signedAt: policy.signedAt,
      signedByName: policy.signedByName,
    };
  }
}
