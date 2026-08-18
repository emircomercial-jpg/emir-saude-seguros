import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prismaMock: any;
  let whatsappMock: any;
  let emailMock: any;

  function futurePolicy(daysFromNow: number, overrides: any = {}) {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysFromNow);
    return {
      id: 'policy-1', policyNumber: 'AP-2026-000001', endDate,
      members: [{
        insuredMember: {
          id: 'insured-1', fullName: 'Cliente Teste', email: 'cliente@teste.co.ao',
          phone: '923000000', whatsappOptIn: true, deletedAt: null,
        },
      }],
      ...overrides,
    };
  }

  beforeEach(() => {
    prismaMock = {
      notificationLog: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({}) },
      policy: { findMany: jest.fn().mockResolvedValue([]) },
      premium: { findMany: jest.fn().mockResolvedValue([]) },
      organization: { findMany: jest.fn().mockResolvedValue([]) },
    };
    whatsappMock = { sendPolicyRenewalReminder: jest.fn(), sendOverduePremiumNotification: jest.fn() };
    emailMock = { sendPolicyRenewalReminder: jest.fn(), sendOverduePremiumNotification: jest.fn() };
    service = new NotificationsService(prismaMock, whatsappMock, emailMock);
  });

  describe('runChecks — lembretes de renovação', () => {
    it('sends both email and WhatsApp reminders for a policy nearing expiry', async () => {
      prismaMock.policy.findMany.mockResolvedValue([futurePolicy(9)]);

      const result = await service.runChecks('org-1');

      expect(emailMock.sendPolicyRenewalReminder).toHaveBeenCalledWith(
        'cliente@teste.co.ao', 'Cliente Teste', 'AP-2026-000001', expect.any(Date), expect.any(Number),
      );
      expect(whatsappMock.sendPolicyRenewalReminder).toHaveBeenCalled();
      expect(result.renewalRemindersSent).toBe(2);
    });

    it('never sends WhatsApp when the insured has not opted in', async () => {
      const policy = futurePolicy(9);
      policy.members[0].insuredMember.whatsappOptIn = false;
      prismaMock.policy.findMany.mockResolvedValue([policy]);

      await service.runChecks('org-1');

      expect(whatsappMock.sendPolicyRenewalReminder).not.toHaveBeenCalled();
      expect(emailMock.sendPolicyRenewalReminder).toHaveBeenCalled();
    });

    it('never sends the same reminder twice for the same policy and channel', async () => {
      prismaMock.policy.findMany.mockResolvedValue([futurePolicy(9)]);
      prismaMock.notificationLog.findUnique.mockResolvedValue({ id: 'already-sent' });

      const result = await service.runChecks('org-1');

      expect(emailMock.sendPolicyRenewalReminder).not.toHaveBeenCalled();
      expect(whatsappMock.sendPolicyRenewalReminder).not.toHaveBeenCalled();
      expect(result.renewalRemindersSent).toBe(0);
    });

    it('uses the closest matching threshold (e.g. 9 days maps to the 10-day reminder, not 15)', async () => {
      prismaMock.policy.findMany.mockResolvedValue([futurePolicy(9)]);

      await service.runChecks('org-1');

      expect(prismaMock.notificationLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ type: 'policy_renewal_10d' }) }),
      );
    });

    it('does not fail the whole run if a single notification fails to send', async () => {
      prismaMock.policy.findMany.mockResolvedValue([futurePolicy(9)]);
      emailMock.sendPolicyRenewalReminder.mockRejectedValue(new Error('SMTP indisponível'));

      await expect(service.runChecks('org-1')).resolves.toBeDefined();
    });
  });

  describe('runChecks — mensalidades em atraso', () => {
    it('sends an overdue reminder once per premium, never repeating', async () => {
      prismaMock.premium.findMany.mockResolvedValue([{
        id: 'premium-1', dueDate: new Date('2026-08-01'), value: 9000,
        insuredMember: { id: 'insured-1', fullName: 'Cliente Atrasado', email: 'atrasado@teste.co.ao', phone: '923000000', whatsappOptIn: true, deletedAt: null },
      }]);

      const result = await service.runChecks('org-1');

      expect(emailMock.sendOverduePremiumNotification).toHaveBeenCalled();
      expect(result.overduePremiumRemindersSent).toBe(2);
    });
  });

  describe('runChecksForAllOrganizations', () => {
    it('runs the checks separately for every active organization', async () => {
      prismaMock.organization.findMany.mockResolvedValue([{ id: 'org-1', name: 'Empresa A' }, { id: 'org-2', name: 'Empresa B' }]);
      prismaMock.policy.findMany.mockResolvedValue([]);
      prismaMock.premium.findMany.mockResolvedValue([]);

      const result = await service.runChecksForAllOrganizations();

      expect(Object.keys(result)).toEqual(['Empresa A', 'Empresa B']);
      expect(prismaMock.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: 'active' } }),
      );
    });
  });
});
