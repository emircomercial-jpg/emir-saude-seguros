import { ConflictException } from '@nestjs/common';
import { InsuredService } from './insured.service';

// Regra de negócio: impede duplicação de Bilhete de Identidade e NIF no
// cadastro de segurados, e gera automaticamente o número interno sequencial.
describe('InsuredService', () => {
  let service: InsuredService;
  let prismaMock: any;
  let auditMock: any;

  beforeEach(() => {
    prismaMock = {
      insuredMember: { findUnique: jest.fn(), count: jest.fn().mockResolvedValue(0), create: jest.fn() },
    };
    auditMock = { log: jest.fn() };
    service = new InsuredService(prismaMock, auditMock);
  });

  it('rejects a new insured member with a duplicate ID document number', async () => {
    prismaMock.insuredMember.findUnique.mockResolvedValueOnce({ id: 'existing' });

    await expect(
      service.create('org-1', {
        fullName: 'Maria Fernandes', birthDate: '1990-01-01', sex: 'F', idDocumentNumber: '123456789LA123',
      } as any, 'admin-1'),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects a new insured member with a duplicate NIF', async () => {
    prismaMock.insuredMember.findUnique
      .mockResolvedValueOnce(null) // verificação de BI passa
      .mockResolvedValueOnce({ id: 'existing' }); // verificação de NIF falha

    await expect(
      service.create('org-1', {
        fullName: 'João Manuel', birthDate: '1985-05-10', sex: 'M',
        idDocumentNumber: '999999999LA000', nif: '5000000000',
      } as any, 'admin-1'),
    ).rejects.toThrow(ConflictException);
  });

  it('generates a sequential internal number for a new insured member', async () => {
    prismaMock.insuredMember.findUnique.mockResolvedValue(null);
    prismaMock.insuredMember.count.mockResolvedValue(5);
    prismaMock.insuredMember.create.mockImplementation(({ data }: any) => Promise.resolve(data));

    const result = await service.create('org-1', {
      fullName: 'Ana Paula', birthDate: '1992-03-15', sex: 'F', idDocumentNumber: '111222333LA000',
    } as any, 'admin-1');

    expect(result.internalNumber).toMatch(/^SEG-\d{4}-000006$/);
    expect(auditMock.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'insured.create' }));
  });
});
