import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { CreateCoverageDto } from './dto/create-coverage.dto';

// Planos de saúde e coberturas configuráveis (secções 5 e 6 do briefing
// original). As coberturas nunca são fixas no código — são geridas em base
// de dados, através dos endpoints de coverages.
@Injectable()
export class PlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(organizationId: string) {
    return this.prisma.healthPlan.findMany({
      where: { organizationId, deletedAt: null },
      include: { coverages: true, _count: { select: { companies: true } } },
      orderBy: { name: 'asc' },
      take: 1000, // limite de seguranca (auditoria) - evita devolver toda a tabela de uma vez
    });
  }

  async findOne(id: string, organizationId: string) {
    const plan = await this.prisma.healthPlan.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { coverages: true },
    });
    if (!plan) throw new NotFoundException('Plano não encontrado.');
    return plan;
  }

  async create(organizationId: string, dto: CreatePlanDto, createdBy: string) {
    const existing = await this.prisma.healthPlan.findUnique({
      where: { organizationId_code: { organizationId, code: dto.code } },
    });
    if (existing) throw new ConflictException('Já existe um plano com este código.');

    const plan = await this.prisma.healthPlan.create({
      data: { organizationId, ...dto, createdBy },
      include: { coverages: true },
    });

    await this.auditService.log({
      organizationId,
      userId: createdBy,
      action: 'plan.create',
      module: 'plans',
      entity: 'HealthPlan',
      entityId: plan.id,
      description: `Plano "${plan.name}" (${plan.code}) criado.`,
    });

    return plan;
  }

  async update(id: string, organizationId: string, dto: UpdatePlanDto, updatedBy: string) {
    const existing = await this.findOne(id, organizationId);

    const plan = await this.prisma.healthPlan.update({
      where: { id },
      data: { ...dto, updatedBy },
      include: { coverages: true },
    });

    await this.auditService.log({
      organizationId,
      userId: updatedBy,
      action: 'plan.update',
      module: 'plans',
      entity: 'HealthPlan',
      entityId: id,
      description: `Plano "${existing.name}" actualizado.`,
    });

    return plan;
  }

  async setStatus(id: string, organizationId: string, status: 'active' | 'inactive', updatedBy: string) {
    await this.findOne(id, organizationId);
    const plan = await this.prisma.healthPlan.update({
      where: { id },
      data: { status, updatedBy },
      include: { coverages: true },
    });

    await this.auditService.log({
      organizationId,
      userId: updatedBy,
      action: 'plan.status_update',
      module: 'plans',
      entity: 'HealthPlan',
      entityId: id,
      description: `Estado do plano alterado para "${status}".`,
    });

    return plan;
  }

  async remove(id: string, organizationId: string, updatedBy: string) {
    await this.findOne(id, organizationId);
    await this.prisma.healthPlan.update({ where: { id }, data: { deletedAt: new Date(), updatedBy } });

    await this.auditService.log({
      organizationId,
      userId: updatedBy,
      action: 'plan.delete',
      module: 'plans',
      entity: 'HealthPlan',
      entityId: id,
      description: 'Plano eliminado.',
    });

    return { message: 'Plano eliminado com sucesso.' };
  }

  async addCoverage(planId: string, organizationId: string, dto: CreateCoverageDto, updatedBy: string) {
    await this.findOne(planId, organizationId);
    const coverage = await this.prisma.planCoverage.create({ data: { planId, ...dto } });

    await this.auditService.log({
      organizationId,
      userId: updatedBy,
      action: 'plan.coverage_added',
      module: 'plans',
      entity: 'PlanCoverage',
      entityId: coverage.id,
      description: `Cobertura "${coverage.name}" adicionada ao plano.`,
    });

    return coverage;
  }

  async removeCoverage(planId: string, coverageId: string, organizationId: string, updatedBy: string) {
    await this.findOne(planId, organizationId);
    await this.prisma.planCoverage.delete({ where: { id: coverageId } });

    await this.auditService.log({
      organizationId,
      userId: updatedBy,
      action: 'plan.coverage_removed',
      module: 'plans',
      entity: 'PlanCoverage',
      entityId: coverageId,
      description: 'Cobertura removida do plano.',
    });

    return { message: 'Cobertura removida com sucesso.' };
  }
}
