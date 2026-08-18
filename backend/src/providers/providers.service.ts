import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';

// Prestadores de saúde (secção 14 do briefing original): hospitais,
// clínicas, farmácias, laboratórios, etc. Impede duplicação de NIF.
@Injectable()
export class ProvidersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(organizationId: string, filters: { type?: string; search?: string } = {}) {
    return this.prisma.provider.findMany({
      where: {
        organizationId,
        deletedAt: null,
        type: filters.type || undefined,
        ...(filters.search ? { name: { contains: filters.search, mode: 'insensitive' as const } } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    const provider = await this.prisma.provider.findFirst({ where: { id, organizationId, deletedAt: null } });
    if (!provider) throw new NotFoundException('Prestador não encontrado.');
    return provider;
  }

  async create(organizationId: string, dto: CreateProviderDto, createdBy: string) {
    const existing = await this.prisma.provider.findUnique({
      where: { organizationId_nif: { organizationId, nif: dto.nif } },
    });
    if (existing) throw new ConflictException('Já existe um prestador com este NIF.');

    const provider = await this.prisma.provider.create({ data: { organizationId, ...dto, createdBy } });

    await this.auditService.log({
      organizationId,
      userId: createdBy,
      action: 'provider.create',
      module: 'providers',
      entity: 'Provider',
      entityId: provider.id,
      description: `Prestador "${provider.name}" criado.`,
    });

    return provider;
  }

  async update(id: string, organizationId: string, dto: UpdateProviderDto, updatedBy: string) {
    const existing = await this.findOne(id, organizationId);

    const provider = await this.prisma.provider.update({ where: { id }, data: { ...dto, updatedBy } });

    await this.auditService.log({
      organizationId,
      userId: updatedBy,
      action: 'provider.update',
      module: 'providers',
      entity: 'Provider',
      entityId: id,
      description: `Prestador "${existing.name}" actualizado.`,
    });

    return provider;
  }

  async setStatus(id: string, organizationId: string, status: 'active' | 'suspended' | 'under_review', updatedBy: string) {
    const existing = await this.findOne(id, organizationId);
    const provider = await this.prisma.provider.update({ where: { id }, data: { status, updatedBy } });

    await this.auditService.log({
      organizationId,
      userId: updatedBy,
      action: 'provider.status_update',
      module: 'providers',
      entity: 'Provider',
      entityId: id,
      description: `Estado do prestador "${existing.name}" alterado para "${status}".`,
    });

    return provider;
  }

  async remove(id: string, organizationId: string, updatedBy: string) {
    const existing = await this.findOne(id, organizationId);
    await this.prisma.provider.update({ where: { id }, data: { deletedAt: new Date(), updatedBy } });

    await this.auditService.log({
      organizationId,
      userId: updatedBy,
      action: 'provider.delete',
      module: 'providers',
      entity: 'Provider',
      entityId: id,
      description: `Prestador "${existing.name}" eliminado.`,
    });

    return { message: 'Prestador eliminado com sucesso.' };
  }
}
