import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateAgreementDto } from './dto/create-agreement.dto';
import { UpdateAgreementDto } from './dto/update-agreement.dto';

@Injectable()
export class AgreementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(organizationId: string, status?: string) {
    return this.prisma.insuranceAgreement.findMany({
      where: { organizationId, deletedAt: null, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 1000, // limite de segurança (auditoria) - evita devolver toda a tabela de uma vez
    });
  }

  async findOne(id: string, organizationId: string) {
    const agreement = await this.prisma.insuranceAgreement.findFirst({ where: { id, organizationId, deletedAt: null } });
    if (!agreement) throw new NotFoundException('Convénio não encontrado.');
    return agreement;
  }

  async create(organizationId: string, dto: CreateAgreementDto, createdBy: string) {
    const agreement = await this.prisma.insuranceAgreement.create({
      data: {
        organizationId,
        ...dto,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        createdBy,
      },
    });

    await this.auditService.log({
      organizationId,
      userId: createdBy,
      action: 'agreement.create',
      module: 'agreements',
      entity: 'InsuranceAgreement',
      entityId: agreement.id,
      description: `Convénio com "${agreement.agencyName}" criado.`,
    });

    return agreement;
  }

  async update(id: string, organizationId: string, dto: UpdateAgreementDto, updatedBy: string) {
    await this.findOne(id, organizationId);

    const agreement = await this.prisma.insuranceAgreement.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        updatedBy,
      },
    });

    await this.auditService.log({
      organizationId,
      userId: updatedBy,
      action: 'agreement.update',
      module: 'agreements',
      entity: 'InsuranceAgreement',
      entityId: agreement.id,
      description: `Convénio com "${agreement.agencyName}" actualizado.`,
    });

    return agreement;
  }

  async remove(id: string, organizationId: string, deletedBy: string) {
    const agreement = await this.findOne(id, organizationId);

    await this.prisma.insuranceAgreement.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: deletedBy },
    });

    await this.auditService.log({
      organizationId,
      userId: deletedBy,
      action: 'agreement.delete',
      module: 'agreements',
      entity: 'InsuranceAgreement',
      entityId: id,
      description: `Convénio com "${agreement.agencyName}" removido.`,
    });
  }
}
