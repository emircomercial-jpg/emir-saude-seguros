import { MiddlewareConsumer, Module, NestModule, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { EmailModule } from './email/email.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SettingsModule } from './settings/settings.module';
import { ProfileModule } from './profile/profile.module';
import { InsuredModule } from './insured/insured.module';
import { PlansModule } from './plans/plans.module';
import { CompaniesModule } from './companies/companies.module';
import { PoliciesModule } from './policies/policies.module';
import { CardsModule } from './cards/cards.module';
import { ProvidersModule } from './providers/providers.module';
import { AuthorizationsModule } from './authorizations/authorizations.module';
import { ConsultationsModule } from './consultations/consultations.module';
import { PharmacyModule } from './pharmacy/pharmacy.module';
import { LaboratoryModule } from './laboratory/laboratory.module';
import { ClaimsModule } from './claims/claims.module';
import { ReimbursementsModule } from './reimbursements/reimbursements.module';
import { BillingModule } from './billing/billing.module';
import { PaymentsModule } from './payments/payments.module';
import { ReportsModule } from './reports/reports.module';
import { PortalModule } from './portal/portal.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { AgreementsModule } from './agreements/agreements.module';
import { PlatformModule } from './platform/platform.module';
import { NotificationsModule } from './notifications/notifications.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';

@Module({
  imports: [
    // Configuração global, com validação estrita das variáveis de ambiente
    // no arranque (secção 24 do briefing).
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),

    // Rate limiting global da API (secção 24: "Implementar limite de requisições").
    // Pode ser refinado por rota em blocos futuros (ex: limite mais apertado no login).
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('security.rateLimitTtlSeconds', 60) * 1000,
          limit: config.get<number>('security.rateLimitMax', 100),
        },
      ],
    }),

    DatabaseModule,
    HealthModule,
    AuditModule,
    EmailModule,
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    DashboardModule,
    SettingsModule,
    ProfileModule,
    InsuredModule,
    PlansModule,
    CompaniesModule,
    PoliciesModule,
    CardsModule,
    ProvidersModule,
    AuthorizationsModule,
    ConsultationsModule,
    PharmacyModule,
    LaboratoryModule,
    ClaimsModule,
    ReimbursementsModule,
    BillingModule,
    PaymentsModule,
    ReportsModule,
    PortalModule,
    IntegrationsModule,
    AgreementsModule,
    PlatformModule,
    NotificationsModule,
  ],
  providers: [
    // Guard global de rate limiting.
    { provide: APP_GUARD, useClass: ThrottlerGuard },

    // Autenticação obrigatória em todas as rotas por defeito — apenas rotas
    // marcadas com @Public() (login, refresh, forgot/reset-password, health)
    // ficam isentas (secção 13 do briefing).
    { provide: APP_GUARD, useClass: JwtAuthGuard },

    // Autorização por permissões (RBAC real) — activa apenas nas rotas que
    // declararem @RequirePermissions(...); as restantes não são afectadas.
    { provide: APP_GUARD, useClass: PermissionsGuard },

    // Validação global de DTOs (class-validator) em todos os endpoints.
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true, // remove campos não declarados no DTO (sanitização de entradas)
        forbidNonWhitelisted: true,
        transform: true,
        errorHttpStatusCode: 422,
      }),
    },

    // Filtro global de excepções e interceptor de resposta — garantem que
    // toda a API responde sempre no formato definido na secção 25.
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
