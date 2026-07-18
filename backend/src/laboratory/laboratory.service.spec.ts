import { NotFoundException } from '@nestjs/common';
import { LaboratoryService } from './laboratory.service';

// Solicitação, mudança de estado e anexação de resultado (secção 13).
describe('LaboratoryService', () => {
  let service: LaboratoryService;
  let prismaMock: any;
  let auditMock: any;

  beforeEach(() => {
    prismaMock = {
      insuredMember: { findFirst: jest.fn() },
      laboratoryRequest: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
      laboratoryResult: { create: jest.fn() },
    };
    auditMock = { log: jest.fn() };
    service = new LaboratoryService(prismaMock, auditMock);
  });

  it('rejects a request for an insured member that does not exist', async () => {
    prismaMock.insuredMember.findFirst.mockResolvedValue(null);

    await expect(
      service.createRequest('org-1', { insuredMemberId: 'nonexistent', examName: 'Hemograma' } as any, 'admin-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('creates a lab request and logs the action', async () => {
    prismaMock.insuredMember.findFirst.mockResolvedValue({ id: 'insured-1', fullName: 'Maria' });
    prismaMock.laboratoryRequest.create.mockResolvedValue({ id: 'req-1', examName: 'Hemograma' });

    const result = await service.createRequest('org-1', { insuredMemberId: 'insured-1', examName: 'Hemograma' } as any, 'admin-1');

    expect(result.examName).toBe('Hemograma');
    expect(auditMock.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'laboratory.request_created' }));
  });

  it('attaches a result and marks the request as completed', async () => {
    prismaMock.laboratoryRequest.findFirst.mockResolvedValue({ id: 'req-1', examName: 'Hemograma' });
    prismaMock.laboratoryResult.create.mockResolvedValue({ id: 'result-1', resultAttachmentUrl: 'https://example.com/result.pdf' });

    const result = await service.attachResult('req-1', 'org-1', { resultAttachmentUrl: 'https://example.com/result.pdf' } as any, 'admin-1');

    expect(result.resultAttachmentUrl).toBe('https://example.com/result.pdf');
    expect(prismaMock.laboratoryRequest.update).toHaveBeenCalledWith({
      where: { id: 'req-1' }, data: { status: 'completed' },
    });
    expect(auditMock.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'laboratory.result_attached' }));
  });
});
