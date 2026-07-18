import { DevWhatsAppService } from './dev-whatsapp.service';

// Implementação de desenvolvimento: nunca deve lançar excepções.
describe('DevWhatsAppService', () => {
  let service: DevWhatsAppService;

  beforeEach(() => {
    service = new DevWhatsAppService();
  });

  it('resolves without throwing for every notification type', async () => {
    await expect(service.sendClaimDecisionNotification('923456789', 'Ana', 'SIN-2026-000001', 'approved')).resolves.toBeUndefined();
    await expect(service.sendReimbursementDecisionNotification('923456789', 'Ana', 'REEMB-2026-000001', 'rejected')).resolves.toBeUndefined();
    await expect(service.sendAuthorizationDecisionNotification('923456789', 'Ana', 'AUT-2026-000001', 'approved')).resolves.toBeUndefined();
    await expect(service.sendOverduePremiumNotification('923456789', 'Ana', new Date(), 5000)).resolves.toBeUndefined();
  });
});
