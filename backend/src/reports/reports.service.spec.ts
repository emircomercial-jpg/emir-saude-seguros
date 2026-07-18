import { BadRequestException } from '@nestjs/common';
import { ReportsService } from './reports.service';

// Catálogo de relatórios e geração de ficheiros (secção 24 do briefing).
describe('ReportsService', () => {
  let service: ReportsService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      insuredMember: { findMany: jest.fn().mockResolvedValue([]) },
      company: { findMany: jest.fn().mockResolvedValue([]) },
      policy: { findMany: jest.fn().mockResolvedValue([]) },
      claim: { findMany: jest.fn().mockResolvedValue([]) },
      reimbursement: { findMany: jest.fn().mockResolvedValue([]) },
      premium: { findMany: jest.fn().mockResolvedValue([]) },
    };
    service = new ReportsService(prismaMock);
  });

  it('rejects an unknown report key', async () => {
    await expect(service.export('unknown-report', 'xlsx', 'org-1')).rejects.toThrow(BadRequestException);
  });

  it('rejects an invalid export format', async () => {
    await expect(service.export('insured', 'csv', 'org-1')).rejects.toThrow(BadRequestException);
  });

  it('generates a valid Excel buffer for the insured members report', async () => {
    prismaMock.insuredMember.findMany.mockResolvedValue([
      { internalNumber: 'SEG-2026-000001', fullName: 'Maria', idDocumentNumber: '123', phone: '900000000', status: 'active' },
    ]);

    const result = await service.export('insured', 'xlsx', 'org-1');

    expect(result.filename).toMatch(/^insured-\d{4}-\d{2}-\d{2}\.xlsx$/);
    expect(result.contentType).toContain('spreadsheetml');
    expect(result.buffer.length).toBeGreaterThan(0);
  });

  it('generates a valid PDF buffer for the companies report', async () => {
    prismaMock.company.findMany.mockResolvedValue([
      { legalName: 'ACME Lda', nif: '5000123456', plan: { name: 'Plano Família' }, status: 'active' },
    ]);

    const result = await service.export('companies', 'pdf', 'org-1');

    expect(result.filename).toMatch(/^companies-\d{4}-\d{2}-\d{2}\.pdf$/);
    expect(result.contentType).toBe('application/pdf');
    expect(result.buffer.slice(0, 4).toString()).toBe('%PDF');
  });

  it('lists all available reports', () => {
    const reports = service.listAvailableReports();
    expect(reports.length).toBeGreaterThanOrEqual(6);
    expect(reports.map((r) => r.key)).toContain('premiums');
  });
});
