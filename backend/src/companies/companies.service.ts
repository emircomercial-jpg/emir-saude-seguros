import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { normalizePagination, buildPaginationMeta } from '../common/utils/pagination.util';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

// Empresas clientes (secção 15 do briefing original): empresas que
// contratam seguros para os seus trabalhadores. Impede duplicação de NIF.
@Injectable()
export class CompaniesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(organizationId: string, query: { search?: string; page?: number; pageSize?: number }) {
    const { page, pageSize, skip, take } = normalizePagination(query);

    const where = {
      organizationId,
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { legalName: { contains: query.search, mode: 'insensitive' as const } },
              { nif: { contains: query.search } },
            ],
          }
        : {}),
    };

    const [items, totalItems] = await Promise.all([
      this.prisma.company.findMany({
        where,
        include: { plan: true },
        orderBy: { legalName: 'asc' },
        skip,
        take,
      }),
      this.prisma.company.count({ where }),
    ]);

    return { items, meta: buildPaginationMeta(page, pageSize, totalItems) };
  }

  async findOne(id: string, organizationId: string) {
    const company = await this.prisma.company.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { plan: true },
    });
    if (!company) throw new NotFoundException('Empresa não encontrada.');
    return company;
  }

  async create(organizationId: string, dto: CreateCompanyDto, createdBy: string) {
    const existing = await this.prisma.company.findUnique({
      where: { organizationId_nif: { organizationId, nif: dto.nif } },
    });
    if (existing) throw new ConflictException('Já existe uma empresa com este NIF.');

    const company = await this.prisma.company.create({
      data: {
        organizationId,
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        createdBy,
      },
      include: { plan: true },
    });

    await this.auditService.log({
      organizationId,
      userId: createdBy,
      action: 'company.create',
      module: 'companies',
      entity: 'Company',
      entityId: company.id,
      description: `Empresa "${company.legalName}" criada.`,
    });

    return company;
  }

  async update(id: string, organizationId: string, dto: UpdateCompanyDto, updatedBy: string) {
    const existing = await this.findOne(id, organizationId);

    const company = await this.prisma.company.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        updatedBy,
      },
      include: { plan: true },
    });

    await this.auditService.log({
      organizationId,
      userId: updatedBy,
      action: 'company.update',
      module: 'companies',
      entity: 'Company',
      entityId: id,
      description: `Empresa "${existing.legalName}" actualizada.`,
    });

    return company;
  }

  async setStatus(id: string, organizationId: string, status: 'active' | 'suspended' | 'cancelled', updatedBy: string) {
    const existing = await this.findOne(id, organizationId);
    const company = await this.prisma.company.update({
      where: { id },
      data: { status, updatedBy },
      include: { plan: true },
    });

    await this.auditService.log({
      organizationId,
      userId: updatedBy,
      action: 'company.status_update',
      module: 'companies',
      entity: 'Company',
      entityId: id,
      description: `Estado da empresa "${existing.legalName}" alterado para "${status}".`,
    });

    return company;
  }

  async remove(id: string, organizationId: string, updatedBy: string) {
    const existing = await this.findOne(id, organizationId);
    await this.prisma.company.update({ where: { id }, data: { deletedAt: new Date(), updatedBy } });

    await this.auditService.log({
      organizationId,
      userId: updatedBy,
      action: 'company.delete',
      module: 'companies',
      entity: 'Company',
      entityId: id,
      description: `Empresa "${existing.legalName}" eliminada.`,
    });

    return { message: 'Empresa eliminada com sucesso.' };
  }
}
