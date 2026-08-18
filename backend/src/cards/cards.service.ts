import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';

// Cartão de Seguro de Saúde (secção 8) e validação rápida (secção 9).
@Injectable()
export class CardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private generateCardNumber(): string {
    return `EMIR-${crypto.randomInt(100000000, 999999999)}`;
  }

  private generateQrToken(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  async issue(insuredMemberId: string, organizationId: string, issuedBy: string, validityYears = 1) {
    const insured = await this.prisma.insuredMember.findFirst({
      where: { id: insuredMemberId, organizationId, deletedAt: null },
    });
    if (!insured) throw new NotFoundException('Segurado não encontrado.');

    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + validityYears);

    const card = await this.prisma.insuranceCard.create({
      data: {
        insuredMemberId,
        cardNumber: this.generateCardNumber(),
        qrCodeToken: this.generateQrToken(),
        expiryDate,
      },
    });

    await this.auditService.log({
      organizationId,
      userId: issuedBy,
      action: 'card.issue',
      module: 'cards',
      entity: 'InsuranceCard',
      entityId: card.id,
      description: `Cartão ${card.cardNumber} emitido para "${insured.fullName}".`,
    });

    return card;
  }

  async listByInsured(insuredMemberId: string, organizationId: string) {
    const insured = await this.prisma.insuredMember.findFirst({ where: { id: insuredMemberId, organizationId, deletedAt: null } });
    if (!insured) throw new NotFoundException('Segurado não encontrado.');

    return this.prisma.insuranceCard.findMany({
      where: { insuredMemberId },
      orderBy: { issueDate: 'desc' },
    });
  }

  private async findCardInOrg(id: string, organizationId: string) {
    const card = await this.prisma.insuranceCard.findFirst({
      where: { id, insuredMember: { organizationId } },
      include: { insuredMember: true },
    });
    if (!card) throw new NotFoundException('Cartão não encontrado.');
    return card;
  }

  // Usado para gerar o PDF imprimível do cartão — reutiliza a mesma
  // pesquisa (com o Segurado incluído) já usada internamente.
  async findForPrint(id: string, organizationId: string) {
    return this.findCardInOrg(id, organizationId);
  }

  async block(id: string, organizationId: string, updatedBy: string) {
    const card = await this.findCardInOrg(id, organizationId);
    const updated = await this.prisma.insuranceCard.update({ where: { id }, data: { status: 'blocked' } });

    await this.auditService.log({
      organizationId,
      userId: updatedBy,
      action: 'card.block',
      module: 'cards',
      entity: 'InsuranceCard',
      entityId: id,
      description: `Cartão ${card.cardNumber} bloqueado.`,
    });

    return updated;
  }

  async reportLost(id: string, organizationId: string, updatedBy: string) {
    const card = await this.findCardInOrg(id, organizationId);
    const updated = await this.prisma.insuranceCard.update({ where: { id }, data: { status: 'lost' } });

    await this.auditService.log({
      organizationId,
      userId: updatedBy,
      action: 'card.report_lost',
      module: 'cards',
      entity: 'InsuranceCard',
      entityId: id,
      description: `Perda do cartão ${card.cardNumber} registada.`,
    });

    return updated;
  }

  async reportStolen(id: string, organizationId: string, updatedBy: string) {
    const card = await this.findCardInOrg(id, organizationId);
    const updated = await this.prisma.insuranceCard.update({ where: { id }, data: { status: 'stolen' } });

    await this.auditService.log({
      organizationId,
      userId: updatedBy,
      action: 'card.report_stolen',
      module: 'cards',
      entity: 'InsuranceCard',
      entityId: id,
      description: `Roubo do cartão ${card.cardNumber} registado.`,
    });

    return updated;
  }

  // Emite segunda via: marca o cartão actual como substituído e cria um novo.
  async replace(id: string, organizationId: string, updatedBy: string) {
    const oldCard = await this.findCardInOrg(id, organizationId);
    await this.prisma.insuranceCard.update({ where: { id }, data: { status: 'replaced' } });

    const newCard = await this.issue(oldCard.insuredMemberId, organizationId, updatedBy);

    await this.auditService.log({
      organizationId,
      userId: updatedBy,
      action: 'card.replace',
      module: 'cards',
      entity: 'InsuranceCard',
      entityId: newCard.id,
      description: `Segunda via emitida em substituição do cartão ${oldCard.cardNumber}.`,
    });

    return newCard;
  }

  // Validação rápida (secção 9): por número de cartão, BI ou token do QR Code.
  // Devolve apenas os dados necessários — nunca dados clínicos.
  async validate(organizationId: string, query: { cardNumber?: string; idDocumentNumber?: string; qrToken?: string }) {
    let card: Awaited<ReturnType<typeof this.prisma.insuranceCard.findUnique>> = null;

    if (query.qrToken) {
      card = await this.prisma.insuranceCard.findUnique({ where: { qrCodeToken: query.qrToken } });
    } else if (query.cardNumber) {
      card = await this.prisma.insuranceCard.findUnique({ where: { cardNumber: query.cardNumber } });
    }

    let insured;
    if (card) {
      insured = await this.prisma.insuredMember.findFirst({
        where: { id: card.insuredMemberId, organizationId },
        include: { dependents: { where: { deletedAt: null } } },
      });
    } else if (query.idDocumentNumber) {
      insured = await this.prisma.insuredMember.findFirst({
        where: { idDocumentNumber: query.idDocumentNumber, organizationId },
        include: { dependents: { where: { deletedAt: null } } },
      });
    }

    if (!insured) throw new NotFoundException('Segurado não encontrado para os dados fornecidos.');

    if (card && (card.status !== 'active' || card.expiryDate < new Date())) {
      throw new BadRequestException(`Cartão inválido (estado: ${card.status}).`);
    }

    if (insured.status !== 'active') {
      throw new BadRequestException(`Segurado com estado "${insured.status}" — serviço não autorizado.`);
    }

    return {
      insuredMemberId: insured.id,
      fullName: insured.fullName,
      status: insured.status,
      cardValidUntil: card?.expiryDate,
      dependentsCount: insured.dependents.length,
    };
  }
}
