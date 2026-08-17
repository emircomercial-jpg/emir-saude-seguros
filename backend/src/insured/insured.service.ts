import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { normalizePagination, buildPaginationMeta } from '../common/utils/pagination.util';
import { CreateInsuredDto } from './dto/create-insured.dto';
import { UpdateInsuredDto } from './dto/update-insured.dto';
import { QueryInsuredDto } from './dto/query-insured.dto';
import { CreateDependentDto } from './dto/create-dependent.dto';
import { RegisterInsuredDto } from './dto/register-insured.dto';

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

  // Pesquisa prática por Bilhete de Identidade — usada para preencher
  // automaticamente o formulário de registo quando a pessoa já existe no
  // sistema (como Segurado já registado, ou como Dependente de outro
  // Segurado que agora precisa do seu próprio registo, ex: atingiu a
  // maioridade). Nunca devolve dados de outra organização.
  async lookupByDocument(organizationId: string, idDocumentNumber: string) {
    const insured = await this.prisma.insuredMember.findFirst({
      where: { organizationId, idDocumentNumber, deletedAt: null },
    });
    if (insured) {
      return { found: true, type: 'insured' as const, alreadyRegistered: true, data: insured };
    }

    const dependent = await this.prisma.dependent.findFirst({
      where: {
        idDocumentNumber,
        deletedAt: null,
        insuredMember: { organizationId, deletedAt: null },
      },
      include: { insuredMember: { select: { fullName: true, internalNumber: true } } },
    });
    if (dependent) {
      return {
        found: true,
        type: 'dependent' as const,
        alreadyRegistered: false,
        data: {
          fullName: dependent.fullName,
          birthDate: dependent.birthDate,
          sex: dependent.sex,
          idDocumentNumber: dependent.idDocumentNumber,
          phone: dependent.phone,
        },
        dependentOf: dependent.insuredMember,
      };
    }

    return { found: false };
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

  // Registo prático e completo de um novo integrante: Segurado + Apólice
  // (a partir do Plano escolhido, obrigatório) + Cartão de Seguro emitido
  // de imediato + Dependentes (se indicados) — tudo numa única transacção
  // de base de dados: ou fica tudo criado com sucesso, ou nada fica criado
  // (nunca um Segurado "órfão" sem apólice nem cartão, por exemplo, se o
  // pedido falhar a meio).
  async registerComplete(organizationId: string, dto: RegisterInsuredDto, createdBy: string) {
    const duplicateDoc = await this.prisma.insuredMember.findUnique({ where: { idDocumentNumber: dto.idDocumentNumber } });
    if (duplicateDoc) throw new ConflictException('Já existe um segurado com este Bilhete de Identidade.');

    if (dto.nif) {
      const duplicateNif = await this.prisma.insuredMember.findUnique({ where: { nif: dto.nif } });
      if (duplicateNif) throw new ConflictException('Já existe um segurado com este NIF.');
    }

    const plan = await this.prisma.healthPlan.findFirst({ where: { id: dto.planId, organizationId, deletedAt: null } });
    if (!plan) throw new BadRequestException('Plano não encontrado.');

    const { planId, dependents, ...insuredData } = dto;

    const result = await this.prisma.$transaction(async (tx) => {
      const internalNumber = await this.generateInternalNumber(organizationId);

      const insured = await tx.insuredMember.create({
        data: {
          organizationId,
          internalNumber,
          ...insuredData,
          status: 'active', // já entra activo — o objectivo deste fluxo é ficar operacional de imediato
          birthDate: new Date(insuredData.birthDate),
          idIssueDate: insuredData.idIssueDate ? new Date(insuredData.idIssueDate) : undefined,
          idExpiryDate: insuredData.idExpiryDate ? new Date(insuredData.idExpiryDate) : undefined,
          joinDate: insuredData.joinDate ? new Date(insuredData.joinDate) : undefined,
          coverageStartDate: insuredData.coverageStartDate ? new Date(insuredData.coverageStartDate) : undefined,
          coverageEndDate: insuredData.coverageEndDate ? new Date(insuredData.coverageEndDate) : undefined,
          createdBy,
        },
      });

      // Apólice — datas por omissão práticas: início hoje, um ano de
      // validade, valor igual à mensalidade do plano escolhido.
      const policyCount = await tx.policy.count({ where: { organizationId } });
      const year = new Date().getFullYear();
      const policyNumber = `AP-${year}-${String(policyCount + 1).padStart(6, '0')}`;
      const today = new Date();
      const oneYearLater = new Date(today);
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

      const policy = await tx.policy.create({
        data: {
          organizationId,
          policyNumber,
          planId,
          issueDate: today,
          startDate: today,
          endDate: oneYearLater,
          value: plan.monthlyValue,
          paymentMode: 'monthly',
          createdBy,
          members: { create: [{ insuredMemberId: insured.id }] },
        },
        include: { plan: true },
      });

      // Cartão de Seguro, emitido de imediato.
      const cardExpiry = new Date(today);
      cardExpiry.setFullYear(cardExpiry.getFullYear() + 1);
      const card = await tx.insuranceCard.create({
        data: {
          insuredMemberId: insured.id,
          cardNumber: `EMIR-${crypto.randomInt(100000000, 999999999)}`,
          qrCodeToken: crypto.randomBytes(16).toString('hex'),
          expiryDate: cardExpiry,
        },
      });

      // Dependentes, se indicados.
      const createdDependents: Awaited<ReturnType<typeof tx.dependent.create>>[] = [];
      for (const dep of dependents ?? []) {
        const dependent = await tx.dependent.create({
          data: { insuredMemberId: insured.id, ...dep, relationship: dep.relationship as any, birthDate: new Date(dep.birthDate) },
        });
        createdDependents.push(dependent);
      }

      return { insured, policy, card, dependents: createdDependents };
    });

    await this.auditService.log({
      organizationId,
      userId: createdBy,
      action: 'insured.register_complete',
      module: 'insured',
      entity: 'InsuredMember',
      entityId: result.insured.id,
      description: `Segurado "${result.insured.fullName}" (${result.insured.internalNumber}) registado com apólice "${result.policy.policyNumber}" e cartão "${result.card.cardNumber}"${result.dependents.length ? ` e ${result.dependents.length} dependente(s)` : ''}.`,
    });

    return result;
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
