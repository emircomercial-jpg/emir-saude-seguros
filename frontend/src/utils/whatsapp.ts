// Gera um link de contacto directo por WhatsApp (https://wa.me/...) — sem
// qualquer configuração ou custo. Espelha a lógica do backend
// (backend/src/whatsapp/whatsapp-link.util.ts) para consistência.
export function normalizePhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 9) return `244${digits}`;
  return digits;
}

export function buildWhatsAppLink(phone: string, message?: string): string {
  const normalized = normalizePhoneForWhatsApp(phone);
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${normalized}${text}`;
}

export function openWhatsApp(phone: string, message?: string) {
  window.open(buildWhatsAppLink(phone, message), '_blank', 'noopener,noreferrer');
}
