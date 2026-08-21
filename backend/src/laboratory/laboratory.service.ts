import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateLabRequestDto } from './dto/create-lab-request.dto';
import { AttachResultDto } from './dto/attach-result.dto';

// Exames laboratoriais e de imagem (secção 13 do briefing original):
// solicitação, acompanhamento de estado e anexação de resultado.
@Injectable()
export class LaboratoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async createRequest(organizationId: string, dto: CreateLabRequestDto, createdBy: string) {
    const insured = await this.prisma.insuredMember.findFirst({
      where: { id: dto.insuredMemberId, organizationId, deletedAt: null },
    });
    if (!insured) throw new NotFoundException('Segurado não encontrado.');

    const request = await this.prisma.laboratoryRequest.create({ data: { organizationId, ...dto } });

    await this.auditService.log({
      organizationId,
      userId: createdBy,
      action: 'laboratory.request_created',
      module: 'laboratory',
      entity: 'LaboratoryRequest',
      entityId: request.id,
      description: `Exame "${request.examName}" solicitado para "${insured.fullName}".`,
    });

    return request;
  }

  async findAll(organizationId: string, status?: string) {
    return this.prisma.laboratoryRequest.findMany({
      where: { organizationId, status: status || undefined },
      include: { insuredMember: true, provider: true, result: true },
      orderBy: { requestedAt: 'desc' },
      take: 1000, // limite de seguranca (auditoria) - evita devolver toda a tabela de uma vez
    });
  }

  private async findOne(id: string, organizationId: string) {
    const request = await this.prisma.laboratoryRequest.findFirst({ where: { id, organizationId } });
    if (!request) throw new NotFoundException('Solicitação de exame não encontrada.');
    return request;
  }

  async setStatus(id: string, organizationId: string, status: string, updatedBy: string) {
    const existing = await this.findOne(id, organizationId);
    const request = await this.prisma.laboratoryRequest.update({ where: { id }, data: { status } });

    await this.auditService.log({
      organizationId,
      userId: updatedBy,
      action: 'laboratory.status_update',
      module: 'laboratory',
      entity: 'LaboratoryRequest',
      entityId: id,
      description: `Estado do exame "${existing.examName}" alterado para "${status}".`,
    });

    return request;
  }

  async attachResult(id: string, organizationId: string, dto: AttachResultDto, updatedBy: string) {
    const existing = await this.findOne(id, organizationId);

    const result = await this.prisma.laboratoryResult.create({
      data: { laboratoryRequestId: id, ...dto },
    });
    await this.prisma.laboratoryRequest.update({ where: { id }, data: { status: 'completed' } });

    await this.auditService.log({
      organizationId,
      userId: updatedBy,
      action: 'laboratory.result_attached',
      module: 'laboratory',
      entity: 'LaboratoryRequest',
      entityId: id,
      description: `Resultado anexado ao exame "${existing.examName}".`,
    });

    return result;
  }
}
