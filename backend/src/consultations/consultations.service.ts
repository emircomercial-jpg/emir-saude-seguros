import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateConsultationDto } from './dto/create-consultation.dto';

// Integração com atendimento clínico (secção 11 do briefing original).
// Ao registar a consulta, verifica automaticamente a cobertura do segurado
// através da apólice activa, calcula o copagamento, e alerta sobre carência
// ou suspensão — sem nunca bloquear silenciosamente o atendimento.
@Injectable()
export class ConsultationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // Encontra o plano activo do segurado através da apólice em que é beneficiário.
  private async findActivePlan(insuredMemberId: string) {
    const policyMember = await this.prisma.policyMember.findFirst({
      where: { insuredMemberId, policy: { status: 'active', deletedAt: null } },
      include: { policy: { include: { plan: { include: { coverages: true } } } } },
      orderBy: { id: 'desc' },
    });
    return policyMember?.policy.plan ?? null;
  }

  // Carrega os dados do segurado e a cobertura correspondente, devolvendo os
  // alertas necessários antes de o atendimento prosseguir (secção 11).
  async checkCoverage(insuredMemberId: string, organizationId: string, coverageName?: string) {
    const insured = await this.prisma.insuredMember.findFirst({
      where: { id: insuredMemberId, organizationId, deletedAt: null },
    });
    if (!insured) throw new NotFoundException('Segurado não encontrado.');

    const plan = await this.findActivePlan(insuredMemberId);
    const alerts: string[] = [];

    if (insured.status === 'suspended') alerts.push('Segurado suspenso — serviço bloqueado, salvo urgência.');
    else if (insured.status === 'waiting_period') alerts.push('Segurado em período de carência.');
    else if (insured.status !== 'active') alerts.push(`Estado do segurado: ${insured.status}.`);

    if (!plan) alerts.push('Nenhuma apólice activa encontrada para este segurado.');

    const coverage = coverageName
      ? plan?.coverages.find((c) => c.name.toLowerCase() === coverageName.toLowerCase())
      : undefined;

    if (plan && coverageName && !coverage) alerts.push('Cobertura não configurada para este plano.');
    if (coverage?.requiresAuthorization) alerts.push('Este serviço requer autorização prévia.');

    return {
      insured: { id: insured.id, fullName: insured.fullName, status: insured.status, plan: plan?.name },
      coverage,
      alerts,
    };
  }

  async create(organizationId: string, dto: CreateConsultationDto, createdBy: string) {
    const insured = await this.prisma.insuredMember.findFirst({
      where: { id: dto.insuredMemberId, organizationId, deletedAt: null },
    });
    if (!insured) throw new NotFoundException('Segurado não encontrado.');
    if (insured.status === 'suspended' || insured.status === 'blocked_nonpayment') {
      throw new BadRequestException(`Segurado com estado "${insured.status}" — serviço não autorizado.`);
    }

    const plan = await this.findActivePlan(dto.insuredMemberId);
    const coverage = plan?.coverages.find(
      (c) => c.name.toLowerCase() === (dto.consultationType || 'consulta').toLowerCase(),
    );

    let coveredValue: number | undefined;
    let copayment: number | undefined;
    if (dto.totalValue && coverage) {
      coveredValue = (dto.totalValue * Number(coverage.coveredPercentage)) / 100;
      copayment = dto.totalValue - coveredValue;
    }

    const consultation = await this.prisma.consultation.create({
      data: { organizationId, ...dto, coveredValue, copayment, createdBy },
    });

    await this.auditService.log({
      organizationId,
      userId: createdBy,
      action: 'consultation.create',
      module: 'consultations',
      entity: 'Consultation',
      entityId: consultation.id,
      description: `Consulta registada para "${insured.fullName}".`,
    });

    return consultation;
  }

  async findAll(organizationId: string, insuredMemberId?: string) {
    return this.prisma.consultation.findMany({
      where: { organizationId, insuredMemberId: insuredMemberId || undefined },
      include: { insuredMember: true, provider: true },
      orderBy: { date: 'desc' },
    });
  }
}
