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

  describe('registerComplete', () => {
    function buildTxMock() {
      return {
        insuredMember: { create: jest.fn().mockResolvedValue({ id: 'insured-1', fullName: 'Rosa Manuel', internalNumber: 'SEG-2026-000001' }) },
        policy: {
          count: jest.fn().mockResolvedValue(0),
          create: jest.fn().mockResolvedValue({ id: 'policy-1', policyNumber: 'AP-2026-000001', plan: { name: 'Plano Base' } }),
        },
        insuranceCard: { create: jest.fn().mockResolvedValue({ id: 'card-1', cardNumber: 'EMIR-123456789' }) },
        dependent: { create: jest.fn().mockResolvedValue({ id: 'dep-1', fullName: 'Criança Teste' }) },
      };
    }

    it('rejects when the chosen plan does not exist', async () => {
      prismaMock.insuredMember.findUnique.mockResolvedValue(null);
      prismaMock.healthPlan = { findFirst: jest.fn().mockResolvedValue(null) };

      await expect(
        service.registerComplete('org-1', {
          fullName: 'Rosa Manuel', birthDate: '1990-01-01', sex: 'F', idDocumentNumber: '000111222LA000', planId: 'plan-x',
        } as any, 'admin-1'),
      ).rejects.toThrow('Plano não encontrado.');
    });

    it('creates the insured member, policy, and card atomically inside a single transaction', async () => {
      prismaMock.insuredMember.findUnique.mockResolvedValue(null);
      prismaMock.healthPlan = { findFirst: jest.fn().mockResolvedValue({ id: 'plan-1', monthlyValue: 15000 }) };
      const txMock = buildTxMock();
      prismaMock.$transaction = jest.fn((callback: any) => callback(txMock));

      const result = await service.registerComplete('org-1', {
        fullName: 'Rosa Manuel', birthDate: '1990-01-01', sex: 'F', idDocumentNumber: '000111222LA000', planId: 'plan-1',
      } as any, 'admin-1');

      expect(txMock.insuredMember.create).toHaveBeenCalled();
      expect(txMock.policy.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ planId: 'plan-1', value: 15000 }) }),
      );
      expect(txMock.insuranceCard.create).toHaveBeenCalled();
      expect(result.insured.id).toBe('insured-1');
      expect(result.policy.policyNumber).toBe('AP-2026-000001');
      expect(result.card.cardNumber).toBe('EMIR-123456789');
      expect(auditMock.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'insured.register_complete' }));
    });

    it('also creates any dependents provided, linked to the new insured member', async () => {
      prismaMock.insuredMember.findUnique.mockResolvedValue(null);
      prismaMock.healthPlan = { findFirst: jest.fn().mockResolvedValue({ id: 'plan-1', monthlyValue: 15000 }) };
      const txMock = buildTxMock();
      prismaMock.$transaction = jest.fn((callback: any) => callback(txMock));

      const result = await service.registerComplete('org-1', {
        fullName: 'Rosa Manuel', birthDate: '1990-01-01', sex: 'F', idDocumentNumber: '000111222LA000', planId: 'plan-1',
        dependents: [{ relationship: 'child', fullName: 'Criança Teste', birthDate: '2018-01-01', sex: 'M' }],
      } as any, 'admin-1');

      expect(txMock.dependent.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ insuredMemberId: 'insured-1', fullName: 'Criança Teste' }) }),
      );
      expect(result.dependents).toHaveLength(1);
    });
  });
});
