import { ReimbursementsService } from './reimbursements.service';

// Cálculo automático do valor de reembolso (secção 19): percentagem coberta
// do plano activo, franquia e copagamento.
describe('ReimbursementsService', () => {
  let service: ReimbursementsService;
  let prismaMock: any;
  let auditMock: any;
  let emailMock: any;
  let whatsappMock: any;

  beforeEach(() => {
    prismaMock = {
      insuredMember: { findFirst: jest.fn() },
      policyMember: { findFirst: jest.fn() },
      reimbursement: { count: jest.fn().mockResolvedValue(0), create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    };
    auditMock = { log: jest.fn() };
    emailMock = { sendReimbursementDecisionNotification: jest.fn() };
    whatsappMock = { sendReimbursementDecisionNotification: jest.fn() };
    service = new ReimbursementsService(prismaMock, auditMock, emailMock, whatsappMock);
  });

  it('calculates the eligible value using the active policy plan coverage', async () => {
    prismaMock.insuredMember.findFirst.mockResolvedValue({ id: 'insured-1', fullName: 'Maria' });
    prismaMock.policyMember.findFirst.mockResolvedValue({
      policy: { plan: { copaymentPercentage: 20, deductible: 1000 } },
    });
    prismaMock.reimbursement.create.mockImplementation(({ data }: any) => Promise.resolve(data));

    const result = await service.create('org-1', { insuredMemberId: 'insured-1', requestedValue: 10000 } as any, 'admin-1');

    // (10000 - 1000 franquia) * 80% cobertura = 7200
    expect(result.eligibleValue).toBeCloseTo(7200);
    expect(result.deductible).toBe(1000);
    expect(result.copayment).toBeCloseTo(2800);
  });

  it('defaults to full coverage when the insured member has no active policy', async () => {
    prismaMock.insuredMember.findFirst.mockResolvedValue({ id: 'insured-1', fullName: 'Maria' });
    prismaMock.policyMember.findFirst.mockResolvedValue(null);
    prismaMock.reimbursement.create.mockImplementation(({ data }: any) => Promise.resolve(data));

    const result = await service.create('org-1', { insuredMemberId: 'insured-1', requestedValue: 5000 } as any, 'admin-1');

    expect(result.eligibleValue).toBeCloseTo(5000);
    expect(result.copayment).toBeCloseTo(0);
  });
});
