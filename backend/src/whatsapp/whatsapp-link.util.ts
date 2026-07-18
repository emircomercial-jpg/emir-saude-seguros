// Gera um link de contacto directo por WhatsApp (https://wa.me/...) —
// funciona de imediato, sem qualquer configuração ou custo, e não depende
// de nenhuma API paga. É o mecanismo mais simples de "vínculo com o
// WhatsApp": um clique abre a conversa directamente com o número certo.
//
// Para as notificações automáticas (decisões de sinistros/reembolsos/
// autorizações, mensalidades em atraso), ver whatsapp.service.interface.ts
// — esse canal usa a Meta WhatsApp Cloud API quando configurada.
export function normalizePhoneForWhatsApp(phone: string): string {
  // Remove tudo excepto dígitos. Números angolanos são guardados sem
  // indicativo (ex: "923456789") — assume-se o indicativo de Angola (244)
  // quando o número não começa já por um indicativo de país (mais de 9
  // dígitos sugere que já inclui indicativo).
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 9) return `244${digits}`;
  return digits;
}

export function buildWhatsAppDeepLink(phone: string, message?: string): string {
  const normalized = normalizePhoneForWhatsApp(phone);
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${normalized}${text}`;
}
