import { Body, Controller, Inject, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PlatformService } from './platform.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { Public } from '../common/decorators/public.decorator';
import { EMAIL_SERVICE, EmailService } from '../email/email.service.interface';
import { ConfigService } from '@nestjs/config';

// Auto-registo público de novas empresas clientes — página aberta a
// qualquer pessoa, SEM sessão nenhuma (@Public()), diferente do resto do
// controlador de Plataforma, que exige ser administrador da plataforma.
// Limite de pedidos mais apertado que o resto do sistema, para reduzir
// abuso deste endpoint especificamente aberto ao público.
@Controller('public')
export class PublicSignupController {
  constructor(
    private readonly platformService: PlatformService,
    @Inject(EMAIL_SERVICE) private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  @Post('signup')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async signup(@Body() dto: CreateOrganizationDto) {
    const data = await this.platformService.selfRegisterOrganization(dto);

    // Nunca deixar uma falha no envio do alerta interromper o registo em
    // si — a empresa fica criada de qualquer forma.
    try {
      const ownerEmail = this.config.get<string>('platform.ownerEmail')!;
      await this.email.sendNewOrganizationSelfSignupAlert(ownerEmail, data.organization.name, data.admin.email);
    } catch {
      // Silenciosamente ignorado — o alerta é uma conveniência, não um requisito.
    }

    return {
      data,
      message: `Empresa "${data.organization.name}" criada com sucesso — já podes entrar com ${data.admin.email}.`,
    };
  }
}
