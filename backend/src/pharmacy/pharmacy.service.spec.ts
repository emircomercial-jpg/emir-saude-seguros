import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PharmacyService } from './pharmacy.service';

// Regras de negócio (secção 12): medicamento excluído da cobertura, limite
// mensal, e prevenção de dispensação acima da quantidade prescrita.
describe('PharmacyService', () => {
  let service: PharmacyService;
  let prismaMock: any;
  let auditMock: any;

  beforeEach(() => {
    prismaMock = {
      insuredMember: { findFirst: jest.fn() },
      medicine: { findFirst: jest.fn(), create: jest.fn() },
      pharmacyDispense: { aggregate: jest.fn(), create: jest.fn() },
      prescription: { create: jest.fn(), findUnique: jest.fn() },
    };
    auditMock = { log: jest.fn() };
    service = new PharmacyService(prismaMock, auditMock);
  });

  it('rejects a prescription for a medicine excluded from coverage', async () => {
    prismaMock.insuredMember.findFirst.mockResolvedValue({ id: 'insured-1', fullName: 'Maria' });
    prismaMock.medicine.findFirst.mockResolvedValue({ id: 'med-1', name: 'X', isCovered: false });

    await expect(
      service.createPrescription('org-1', { insuredMemberId: 'insured-1', medicineId: 'med-1', quantity: 10 } as any, 'admin-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a prescription that would exceed the monthly limit', async () => {
    prismaMock.insuredMember.findFirst.mockResolvedValue({ id: 'insured-1', fullName: 'Maria' });
    prismaMock.medicine.findFirst.mockResolvedValue({ id: 'med-1', name: 'X', isCovered: true, monthlyLimitQuantity: 30 });
    prismaMock.pharmacyDispense.aggregate.mockResolvedValue({ _sum: { quantity: 25 } });

    await expect(
      service.createPrescription('org-1', { insuredMemberId: 'insured-1', medicineId: 'med-1', quantity: 10 } as any, 'admin-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects dispensing more than the prescribed quantity', async () => {
    prismaMock.prescription.findUnique.mockResolvedValue({
      id: 'presc-1', quantity: 10, dispenses: [{ quantity: 8 }],
      medicine: { name: 'X', copaymentPercentage: 0 }, insuredMember: { fullName: 'Maria' },
    });

    await expect(
      service.dispense('org-1', { prescriptionId: 'presc-1', quantity: 5 } as any, 'admin-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('dispenses successfully within the prescribed quantity and logs the action', async () => {
    prismaMock.prescription.findUnique.mockResolvedValue({
      id: 'presc-1', quantity: 10, dispenses: [{ quantity: 4 }],
      medicine: { name: 'X', copaymentPercentage: 20 }, insuredMember: { fullName: 'Maria' },
    });
    prismaMock.pharmacyDispense.create.mockImplementation(({ data }: any) => Promise.resolve({ id: 'dispense-1', ...data }));

    const result = await service.dispense('org-1', { prescriptionId: 'presc-1', quantity: 5, value: 1000 } as any, 'admin-1');

    expect(result.coveredValue).toBeCloseTo(800);
    expect(result.insuredPaidValue).toBeCloseTo(200);
    expect(auditMock.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'pharmacy.dispensed' }));
  });
});
