import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { DispenseDto } from './dto/dispense.dto';

// Farmácia e medicamentos (secção 12 do briefing original).
// Controla cobertura, limites mensais, e previne duplicação de dispensação
// a partir da mesma prescrição — nunca dispensa mais do que o prescrito.
@Injectable()
export class PharmacyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ---------- Catálogo de medicamentos ----------

  async createMedicine(organizationId: string, dto: CreateMedicineDto) {
    return this.prisma.medicine.create({ data: { organizationId, ...dto } });
  }

  async listMedicines(organizationId: string, search?: string) {
    return this.prisma.medicine.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  // ---------- Prescrições ----------

  async createPrescription(organizationId: string, dto: CreatePrescriptionDto, createdBy: string) {
    const insured = await this.prisma.insuredMember.findFirst({
      where: { id: dto.insuredMemberId, organizationId, deletedAt: null },
    });
    if (!insured) throw new NotFoundException('Segurado não encontrado.');

    const medicine = await this.prisma.medicine.findFirst({ where: { id: dto.medicineId, organizationId, deletedAt: null } });
    if (!medicine) throw new NotFoundException('Medicamento não encontrado.');
    if (!medicine.isCovered) throw new BadRequestException('Medicamento excluído da cobertura.');

    if (medicine.monthlyLimitQuantity) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const dispensedThisMonth = await this.prisma.pharmacyDispense.aggregate({
        _sum: { quantity: true },
        where: {
          dispensedAt: { gte: startOfMonth },
          prescription: { insuredMemberId: dto.insuredMemberId, medicineId: dto.medicineId },
        },
      });
      const usedQty = dispensedThisMonth._sum.quantity || 0;
      if (usedQty + dto.quantity > medicine.monthlyLimitQuantity) {
        throw new BadRequestException('Limite mensal deste medicamento excedido para o segurado.');
      }
    }

    const prescription = await this.prisma.prescription.create({ data: dto });

    await this.auditService.log({
      organizationId,
      userId: createdBy,
      action: 'pharmacy.prescription_created',
      module: 'pharmacy',
      entity: 'Prescription',
      entityId: prescription.id,
      description: `Prescrição de "${medicine.name}" criada para "${insured.fullName}".`,
    });

    return prescription;
  }

  // Dispensação — previne duplicação: soma já dispensada não pode ultrapassar
  // a quantidade prescrita.
  async dispense(organizationId: string, dto: DispenseDto, dispensedBy: string) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id: dto.prescriptionId },
      include: { dispenses: true, medicine: true, insuredMember: true },
    });
    if (!prescription) throw new NotFoundException('Prescrição não encontrada.');

    const alreadyDispensed = prescription.dispenses.reduce((sum, d) => sum + d.quantity, 0);
    if (alreadyDispensed + dto.quantity > prescription.quantity) {
      throw new BadRequestException('Quantidade dispensada excede a quantidade prescrita.');
    }

    const copaymentPct = Number(prescription.medicine.copaymentPercentage || 0);
    const coveredValue = dto.value ? dto.value * (1 - copaymentPct / 100) : undefined;
    const insuredPaidValue = dto.value && coveredValue !== undefined ? dto.value - coveredValue : undefined;

    const dispense = await this.prisma.pharmacyDispense.create({
      data: { ...dto, coveredValue, insuredPaidValue },
    });

    await this.auditService.log({
      organizationId,
      userId: dispensedBy,
      action: 'pharmacy.dispensed',
      module: 'pharmacy',
      entity: 'PharmacyDispense',
      entityId: dispense.id,
      description: `${dto.quantity}x "${prescription.medicine.name}" dispensado(s) para "${prescription.insuredMember.fullName}".`,
    });

    return dispense;
  }

  async listDispensesByInsured(insuredMemberId: string) {
    return this.prisma.pharmacyDispense.findMany({
      where: { prescription: { insuredMemberId } },
      include: { prescription: { include: { medicine: true } } },
      orderBy: { dispensedAt: 'desc' },
    });
  }
}
