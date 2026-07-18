import { DevEmailService } from './dev-email.service';

// Implementação de desenvolvimento: nunca deve lançar excepções, mesmo sem
// nenhum destinatário/valor especial — apenas regista no terminal.
describe('DevEmailService', () => {
  let service: DevEmailService;

  beforeEach(() => {
    service = new DevEmailService();
  });

  it('resolves without throwing for every notification type', async () => {
    await expect(service.sendPasswordReset('user@test.com', 'Ana', 'token-123')).resolves.toBeUndefined();
    await expect(service.sendClaimDecisionNotification('user@test.com', 'Ana', 'SIN-2026-000001', 'approved')).resolves.toBeUndefined();
    await expect(service.sendReimbursementDecisionNotification('user@test.com', 'Ana', 'REEMB-2026-000001', 'rejected')).resolves.toBeUndefined();
    await expect(service.sendAuthorizationDecisionNotification('user@test.com', 'Ana', 'AUT-2026-000001', 'approved')).resolves.toBeUndefined();
    await expect(service.sendOverduePremiumNotification('user@test.com', 'Ana', new Date(), 5000)).resolves.toBeUndefined();
  });
});
