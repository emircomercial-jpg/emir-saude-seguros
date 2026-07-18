import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { normalizePagination, buildPaginationMeta } from '../common/utils/pagination.util';
import { CreateInsuredDto } from './dto/create-insured.dto';
import { UpdateInsuredDto } from './dto/update-insured.dto';
import { QueryInsuredDto } from './dto/query-insured.dto';
import { CreateDependentDto } from './dto/create-dependent.dto';

const VALID_STATUSES = [
  'active', 'suspended', 'inactive', 'cancelled', 'waiting_period',
  'expired', 'pending_approval', 'blocked_nonpayment',
];

// Segurados e dependentes (secções 3 e 4 do briefing original).
// Regras de negócio: impede duplicação de Bilhete de Identidade e NIF;
// eliminação sempre lógica; número interno gerado automaticamente.
@Injectable()
export class InsuredService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private async generateInternalNumber(organizationId: string): Promise<string> {
    const count = await this.prisma.insuredMember.count({ where: { organizationId } });
    const year = new Date().getFullYear();
    return `SEG-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  async findAll(organizationId: string, query: QueryInsuredDto) {
    const { page, pageSize, skip, take } = normalizePagination(query);

    const where = {
      organizationId,
      deletedAt: null,
      status: (query.status as any) || undefined,
      ...(query.search
        ? {
            OR: [
              { fullName: { contains: query.search, mode: 'insensitive' as const } },
              { internalNumber: { contains: query.search, mode: 'insensitive' as const } },
              { idDocumentNumber: { contains: query.search } },
              { nif: { contains: query.search } },
            ],
          }
        : {}),
    };

    const [items, totalItems] = await Promise.all([
      this.prisma.insuredMember.findMany({
        where,
        include: { dependents: { where: { deletedAt: null } } },
        orderBy: { fullName: 'asc' },
        skip,
        take,
      }),
      this.prisma.insuredMember.count({ where }),
    ]);

    return { items, meta: buildPaginationMeta(page, pageSize, totalItems) };
  }

  async findOne(id: string, organizationId: string) {
    const insured = await this.prisma.insuredMember.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { dependents: { where: { deletedAt: null } } },
    });
    if (!insured) throw new NotFoundException('Segurado não encontrado.');
    return insured;
  }

  async create(organizationId: string, dto: CreateInsuredDto, createdBy: string) {
    const duplicateDoc = await this.prisma.insuredMember.findUnique({ where: { idDocumentNumber: dto.idDocumentNumber } });
    if (duplicateDoc) throw new ConflictException('Já existe um segurado com este Bilhete de Identidade.');

    if (dto.nif) {
      const duplicateNif = await this.prisma.insuredMember.findUnique({ where: { nif: dto.nif } });
      if (duplicateNif) throw new ConflictException('Já existe um segurado com este NIF.');
    }

    const internalNumber = await this.generateInternalNumber(organizationId);

    const insured = await this.prisma.insuredMember.create({
      data: {
        organizationId,
        internalNumber,
        ...dto,
        birthDate: new Date(dto.birthDate),
        idIssueDate: dto.idIssueDate ? new Date(dto.idIssueDate) : undefined,
        idExpiryDate: dto.idExpiryDate ? new Date(dto.idExpiryDate) : undefined,
        joinDate: dto.joinDate ? new Date(dto.joinDate) : undefined,
        coverageStartDate: dto.coverageStartDate ? new Date(dto.coverageStartDate) : undefined,
        coverageEndDate: dto.coverageEndDate ? new Date(dto.coverageEndDate) : undefined,
        createdBy,
      },
    });

    await this.auditService.log({
      organizationId,
      userId: createdBy,
      action: 'insured.create',
      module: 'insured',
      entity: 'InsuredMember',
      entityId: insured.id,
      description: `Segurado "${insured.fullName}" (${insured.internalNumber}) criado.`,
    });

    return insured;
  }

  async update(id: string, organizationId: string, dto: UpdateInsuredDto, updatedBy: string) {
    const existing = await this.findOne(id, organizationId);

    if (dto.nif && dto.nif !== existing.nif) {
      const duplicateNif = await this.prisma.insuredMember.findUnique({ where: { nif: dto.nif } });
      if (duplicateNif) throw new ConflictException('Já existe um segurado com este NIF.');
    }

    const insured = await this.prisma.insuredMember.update({
      where: { id },
      data: {
        ...dto,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        idIssueDate: dto.idIssueDate ? new Date(dto.idIssueDate) : undefined,
        idExpiryDate: dto.idExpiryDate ? new Date(dto.idExpiryDate) : undefined,
        joinDate: dto.joinDate ? new Date(dto.joinDate) : undefined,
        coverageStartDate: dto.coverageStartDate ? new Date(dto.coverageStartDate) : undefined,
        coverageEndDate: dto.coverageEndDate ? new Date(dto.coverageEndDate) : undefined,
        updatedBy,
      },
    });

    await this.auditService.log({
      organizationId,
      userId: updatedBy,
      action: 'insured.update',
      module: 'insured',
      entity: 'InsuredMember',
      entityId: id,
      description: `Dados do segurado "${insured.fullName}" actualizados.`,
    });

    return insured;
  }

  async softDelete(id: string, organizationId: string, updatedBy: string) {
    await this.findOne(id, organizationId);
    await this.prisma.insuredMember.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'inactive', updatedBy },
    });

    await this.auditService.log({
      organizationId,
      userId: updatedBy,
      action: 'insured.delete',
      module: 'insured',
      entity: 'InsuredMember',
      entityId: id,
      description: 'Segurado eliminado (eliminação lógica).',
    });

    return { message: 'Segurado eliminado com sucesso.' };
  }

  async setStatus(id: string, organizationId: string, status: string, updatedBy: string) {
    if (!VALID_STATUSES.includes(status)) throw new BadRequestException('Estado de segurado inválido.');
    const existing = await this.findOne(id, organizationId);

    const insured = await this.prisma.insuredMember.update({
      where: { id },
      data: { status: status as any, updatedBy },
    });

    await this.auditService.log({
      organizationId,
      userId: updatedBy,
      action: 'insured.status_update',
      module: 'insured',
      entity: 'InsuredMember',
      entityId: id,
      description: `Estado do segurado "${existing.fullName}" alterado de "${existing.status}" para "${status}".`,
    });

    return insured;
  }

  // ---------- Dependentes ----------

  async addDependent(insuredMemberId: string, organizationId: string, dto: CreateDependentDto, createdBy: string) {
    const insured = await this.findOne(insuredMemberId, organizationId);

    const dependent = await this.prisma.dependent.create({
      data: {
        insuredMemberId,
        ...dto,
        birthDate: new Date(dto.birthDate),
        inclusionDate: new Date(),
        createdBy,
      } as any,
    });

    await this.auditService.log({
      organizationId,
      userId: createdBy,
      action: 'dependent.create',
      module: 'dependents',
      entity: 'Dependent',
      entityId: dependent.id,
      description: `Dependente "${dependent.fullName}" incluído para o segurado "${insured.fullName}".`,
    });

    return dependent;
  }

  async removeDependent(dependentId: string, organizationId: string, updatedBy: string) {
    const dependent = await this.prisma.dependent.findFirst({
      where: { id: dependentId, deletedAt: null, insuredMember: { organizationId } },
    });
    if (!dependent) throw new NotFoundException('Dependente não encontrado.');

    await this.prisma.dependent.update({
      where: { id: dependentId },
      data: { deletedAt: new Date(), exclusionDate: new Date(), status: 'excluded', updatedBy },
    });

    await this.auditService.log({
      organizationId,
      userId: updatedBy,
      action: 'dependent.remove',
      module: 'dependents',
      entity: 'Dependent',
      entityId: dependentId,
      description: `Dependente "${dependent.fullName}" excluído.`,
    });

    return { message: 'Dependente excluído com sucesso.' };
  }
}
