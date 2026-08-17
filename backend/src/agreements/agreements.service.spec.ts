import { NotFoundException } from '@nestjs/common';
import { AgreementsService } from './agreements.service';

describe('AgreementsService', () => {
  let service: AgreementsService;
  let prismaMock: any;
  let auditMock: any;

  beforeEach(() => {
    prismaMock = {
      insuranceAgreement: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    };
    auditMock = { log: jest.fn() };
    service = new AgreementsService(prismaMock, auditMock);
  });

  describe('create', () => {
    it('creates an agreement and logs the action to the audit trail', async () => {
      prismaMock.insuranceAgreement.create.mockResolvedValue({
        id: 'agr-1', agencyName: 'Seguradora Parceira', agreementType: 'reciprocal_coverage',
      });

      const result = await service.create('org-1', {
        agencyName: 'Seguradora Parceira', agreementType: 'reciprocal_coverage', startDate: '2026-01-01',
      } as any, 'user-1');

      expect(result.id).toBe('agr-1');
      expect(auditMock.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'agreement.create' }));
    });
  });

  describe('findOne', () => {
    it('rejects an agreement that does not exist in this organization', async () => {
      prismaMock.insuranceAgreement.findFirst.mockResolvedValue(null);
      await expect(service.findOne('agr-x', 'org-1')).rejects.toThrow(NotFoundException);
    });

    it('never returns a soft-deleted agreement', async () => {
      prismaMock.insuranceAgreement.findFirst.mockResolvedValue(null);
      await service.findOne('agr-1', 'org-1').catch(() => undefined);
      expect(prismaMock.insuranceAgreement.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ deletedAt: null }) }),
      );
    });
  });

  describe('remove', () => {
    it('soft-deletes rather than permanently removing the record', async () => {
      prismaMock.insuranceAgreement.findFirst.mockResolvedValue({ id: 'agr-1', agencyName: 'Seguradora Parceira' });
      prismaMock.insuranceAgreement.update.mockResolvedValue({});

      await service.remove('agr-1', 'org-1', 'user-1');

      expect(prismaMock.insuranceAgreement.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ deletedAt: expect.any(Date) }) }),
      );
      expect(auditMock.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'agreement.delete' }));
    });
  });

  describe('update', () => {
    it('rejects updating an agreement from another organization', async () => {
      prismaMock.insuranceAgreement.findFirst.mockResolvedValue(null);
      await expect(service.update('agr-1', 'org-1', { status: 'suspended' } as any, 'user-1')).rejects.toThrow(NotFoundException);
    });
  });
});
