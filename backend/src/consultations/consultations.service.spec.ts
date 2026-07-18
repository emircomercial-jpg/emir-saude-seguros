import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConsultationsService } from './consultations.service';

// Verificação automática de cobertura ao registar uma consulta (secção 11).
describe('ConsultationsService', () => {
  let service: ConsultationsService;
  let prismaMock: any;
  let auditMock: any;

  beforeEach(() => {
    prismaMock = {
      insuredMember: { findFirst: jest.fn() },
      policyMember: { findFirst: jest.fn() },
      consultation: { create: jest.fn(), findMany: jest.fn() },
    };
    auditMock = { log: jest.fn() };
    service = new ConsultationsService(prismaMock, auditMock);
  });

  it('rejects registering a consultation for a suspended insured member', async () => {
    prismaMock.insuredMember.findFirst.mockResolvedValue({ id: 'insured-1', fullName: 'Maria', status: 'suspended' });

    await expect(
      service.create('org-1', { insuredMemberId: 'insured-1' } as any, 'admin-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects registering a consultation for an insured member that does not exist', async () => {
    prismaMock.insuredMember.findFirst.mockResolvedValue(null);

    await expect(
      service.create('org-1', { insuredMemberId: 'nonexistent' } as any, 'admin-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('calculates covered value and copayment based on the active plan coverage', async () => {
    prismaMock.insuredMember.findFirst.mockResolvedValue({ id: 'insured-1', fullName: 'Maria', status: 'active' });
    prismaMock.policyMember.findFirst.mockResolvedValue({
      policy: { plan: { name: 'Plano Família', coverages: [{ name: 'consulta geral', coveredPercentage: 80 }] } },
    });
    prismaMock.consultation.create.mockImplementation(({ data }: any) => Promise.resolve({ id: 'consult-1', ...data }));

    const result = await service.create('org-1', {
      insuredMemberId: 'insured-1', consultationType: 'consulta geral', totalValue: 10000,
    } as any, 'admin-1');

    expect(result.coveredValue).toBeCloseTo(8000);
    expect(result.copayment).toBeCloseTo(2000);
    expect(auditMock.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'consultation.create' }));
  });

  it('flags an alert when the insured member has no active policy', async () => {
    prismaMock.insuredMember.findFirst.mockResolvedValue({ id: 'insured-1', fullName: 'Maria', status: 'active' });
    prismaMock.policyMember.findFirst.mockResolvedValue(null);

    const result = await service.checkCoverage('insured-1', 'org-1');

    expect(result.alerts).toContain('Nenhuma apólice activa encontrada para este segurado.');
  });
});
