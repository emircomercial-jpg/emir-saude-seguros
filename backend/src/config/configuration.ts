// Configuração tipada e centralizada — todos os módulos devem ler valores de
// ambiente através deste objecto (via ConfigService), nunca directamente de
// process.env espalhado pelo código.
export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  // A maioria das plataformas de alojamento (Render, Railway, Fly.io, etc.)
  // define automaticamente a variável PORT e espera que a aplicação a
  // utilize — por isso tem sempre prioridade sobre BACKEND_PORT (usada em
  // desenvolvimento local e no Docker Compose).
  port: parseInt(process.env.PORT || process.env.BACKEND_PORT || '3000', 10),

  database: {
    url: process.env.DATABASE_URL,
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  cookie: {
    secret: process.env.COOKIE_SECRET,
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },

  app: {
    name: process.env.APP_NAME || 'EMIR SAÚDE SEGUROS',
    url: process.env.APP_URL,
    apiUrl: process.env.API_URL,
  },

  // E-mail (secção 7) — sem SMTP_HOST, o EmailModule usa a implementação de
  // desenvolvimento (apenas regista no terminal); com SMTP_HOST, usa a
  // implementação real via Nodemailer.
  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: (process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from: process.env.SMTP_FROM || 'EMIR SAÚDE SEGUROS <no-reply@emirsaude.co.ao>',
  },

  // WhatsApp (Meta Cloud API) — sem WHATSAPP_API_TOKEN, o WhatsAppModule
  // usa a implementação de desenvolvimento (apenas regista no terminal,
  // com o link wa.me equivalente); com as variáveis configuradas, usa a
  // implementação real.
  whatsapp: {
    apiToken: process.env.WHATSAPP_API_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    apiVersion: process.env.WHATSAPP_API_VERSION || 'v20.0',
  },

  // Chave secreta exigida pelo gatilho externo de verificação agendada
  // (POST /api/notifications/run-scheduled-checks) — sem isto configurado,
  // esse endpoint recusa sempre o pedido (ver NotificationsCronGuard).
  notifications: {
    cronSecret: process.env.NOTIFICATIONS_CRON_SECRET,
  },

  // E-mail do dono da plataforma (quem vende o sistema a outras empresas)
  // — recebe um alerta sempre que uma nova empresa se auto-regista
  // publicamente, através do formulário público em /adotar.
  platform: {
    ownerEmail: process.env.PLATFORM_OWNER_EMAIL || 'emircomercial@gmail.com',
  },

  localization: {
    timezone: process.env.TIMEZONE || 'Africa/Luanda',
    language: process.env.DEFAULT_LANGUAGE || 'pt',
    currency: process.env.DEFAULT_CURRENCY || 'AOA',
  },

  security: {
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
    loginLockMinutes: parseInt(process.env.LOGIN_LOCK_MINUTES || '15', 10),
    // Rate limiting global da API (secção 24) — janela e limite de pedidos.
    rateLimitTtlSeconds: parseInt(process.env.RATE_LIMIT_TTL_SECONDS || '60', 10),
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },

  swagger: {
    enabled: (process.env.SWAGGER_ENABLED || 'true').toLowerCase() === 'true',
  },
});
