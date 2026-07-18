import { ConflictException } from '@nestjs/common';
import { PlansService } from './plans.service';

// Regra de negócio: impede duplicação de código de plano; coberturas geridas
// em base de dados, nunca fixas no código.
describe('PlansService', () => {
  let service: PlansService;
  let prismaMock: any;
  let auditMock: any;

  beforeEach(() => {
    prismaMock = {
      healthPlan: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
      planCoverage: { create: jest.fn(), delete: jest.fn() },
    };
    auditMock = { log: jest.fn() };
    service = new PlansService(prismaMock, auditMock);
  });

  it('rejects creating a plan with a code that already exists', async () => {
    prismaMock.healthPlan.findUnique.mockResolvedValue({ id: 'existing-plan' });

    await expect(
      service.create('org-1', { name: 'Plano Família', code: 'FAM-01', monthlyValue: 15000 } as any, 'admin-1'),
    ).rejects.toThrow(ConflictException);
  });

  it('adds a coverage to an existing plan', async () => {
    prismaMock.healthPlan.findFirst.mockResolvedValue({ id: 'plan-1', coverages: [] });
    prismaMock.planCoverage.create.mockResolvedValue({ id: 'cov-1', name: 'Consultas', coveredPercentage: 80 });

    const result = await service.addCoverage('plan-1', 'org-1', { name: 'Consultas', coveredPercentage: 80 } as any, 'admin-1');

    expect(result.name).toBe('Consultas');
    expect(auditMock.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'plan.coverage_added' }));
  });
});
