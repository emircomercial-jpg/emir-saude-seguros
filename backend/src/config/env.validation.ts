import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, IsUrl, Min, validateSync } from 'class-validator';

// Validação estrita das variáveis de ambiente no arranque da aplicação
// (secção 24 do briefing). Se alguma variável obrigatória estiver em falta
// ou com um valor inválido, a aplicação falha imediatamente ao arrancar,
// em vez de falhar de forma imprevisível mais tarde, a meio de um pedido.
//
// IMPORTANTE: só são exigidas aqui as variáveis que NÃO têm (nem devem ter)
// um valor por omissão seguro em config/configuration.ts — nomeadamente
// segredos (nunca deve haver um segredo por omissão) e a ligação à base de
// dados. Todas as restantes variáveis têm defaults sensatos em
// configuration.ts (porta, expiração de tokens, localização, limites de
// segurança, etc.) e são aqui marcadas como opcionais — caso contrário,
// esta validação rejeitaria o arranque em plataformas de alojamento (ex:
// Render) que não definem explicitamente todas estas variáveis, mesmo
// quando a aplicação funcionaria perfeitamente bem com os valores por
// omissão.
enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsOptional()
  @IsEnum(Environment)
  NODE_ENV?: Environment;

  // A porta é normalmente definida pela própria plataforma de alojamento
  // (variável PORT, com prioridade sobre BACKEND_PORT — ver
  // configuration.ts) — nunca deve ser exigida aqui.
  @IsOptional()
  @IsNumber()
  @Min(1)
  BACKEND_PORT?: number;

  @IsString()
  DATABASE_URL: string;

  @IsString()
  JWT_ACCESS_SECRET: string;

  @IsString()
  JWT_REFRESH_SECRET: string;

  @IsOptional()
  @IsString()
  JWT_ACCESS_EXPIRES_IN?: string;

  @IsOptional()
  @IsString()
  JWT_REFRESH_EXPIRES_IN?: string;

  @IsString()
  COOKIE_SECRET: string;

  @IsOptional()
  @IsString()
  CORS_ORIGIN?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  APP_URL?: string;

  @IsOptional()
  @IsString()
  TIMEZONE?: string;

  @IsOptional()
  @IsString()
  DEFAULT_LANGUAGE?: string;

  @IsOptional()
  @IsString()
  DEFAULT_CURRENCY?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  MAX_LOGIN_ATTEMPTS?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  LOGIN_LOCK_MINUTES?: number;
}

export function validateEnv(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    const messages = errors
      .map((e) => Object.values(e.constraints || {}).join(', '))
      .join(' | ');
    throw new Error(`Configuração de ambiente inválida: ${messages}`);
  }

  return validatedConfig;
}
