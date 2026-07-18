// Converte strings de duração simples ("15m", "7d", "1h", "30s") em
// milissegundos. Usado para calcular a expiração de tokens e cookies a
// partir das variáveis de ambiente (JWT_ACCESS_EXPIRES_IN, etc.).
export function parseDurationToMs(duration: string): number {
  const match = /^(\d+)\s*(s|m|h|d)$/i.exec(duration.trim());
  if (!match) {
    throw new Error(`Formato de duração inválido: "${duration}". Use algo como "15m", "7d".`);
  }
  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const unitMs: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return value * unitMs[unit];
}
