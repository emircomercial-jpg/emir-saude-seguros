import { ConflictException } from '@nestjs/common';
import { CompaniesService } from './companies.service';

// Regra de negócio: impede duplicação de NIF no cadastro de empresas clientes.
describe('CompaniesService', () => {
  let service: CompaniesService;
  let prismaMock: any;
  let auditMock: any;

  beforeEach(() => {
    prismaMock = {
      company: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
    };
    auditMock = { log: jest.fn() };
    service = new CompaniesService(prismaMock, auditMock);
  });

  it('rejects creating a company with a NIF that already exists', async () => {
    prismaMock.company.findUnique.mockResolvedValue({ id: 'existing-company' });

    await expect(
      service.create('org-1', { legalName: 'ACME Lda', nif: '5000123456' } as any, 'admin-1'),
    ).rejects.toThrow(ConflictException);
  });

  it('creates a company successfully and logs the action', async () => {
    prismaMock.company.findUnique.mockResolvedValue(null);
    prismaMock.company.create.mockResolvedValue({ id: 'company-1', legalName: 'ACME Lda', nif: '5000123456' });

    const result = await service.create('org-1', { legalName: 'ACME Lda', nif: '5000123456' } as any, 'admin-1');

    expect(result.legalName).toBe('ACME Lda');
    expect(auditMock.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'company.create' }));
  });
});
