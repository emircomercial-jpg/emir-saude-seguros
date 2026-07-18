import { normalizePhoneForWhatsApp, buildWhatsAppDeepLink } from './whatsapp-link.util';

// Normalização de número angolano e construção do link wa.me.
describe('whatsapp-link.util', () => {
  it('adds the Angola country code (244) to a local 9-digit number', () => {
    expect(normalizePhoneForWhatsApp('923456789')).toBe('244923456789');
  });

  it('strips non-digit characters before normalizing', () => {
    expect(normalizePhoneForWhatsApp('923 456 789')).toBe('244923456789');
    expect(normalizePhoneForWhatsApp('+244 923-456-789')).toBe('244923456789');
  });

  it('keeps a number that already includes a country code untouched', () => {
    expect(normalizePhoneForWhatsApp('244923456789')).toBe('244923456789');
  });

  it('builds a valid wa.me link with an encoded message', () => {
    const link = buildWhatsAppDeepLink('923456789', 'Olá Maria!');
    expect(link).toBe('https://wa.me/244923456789?text=Ol%C3%A1%20Maria!');
  });

  it('builds a wa.me link without a message when none is provided', () => {
    const link = buildWhatsAppDeepLink('923456789');
    expect(link).toBe('https://wa.me/244923456789');
  });
});
