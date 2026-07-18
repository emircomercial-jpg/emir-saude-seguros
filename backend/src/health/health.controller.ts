import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Public } from '../common/decorators/public.decorator';

// Endpoint de verificação de saúde, usado pelo healthcheck do Docker Compose
// e por monitorização externa. Não exige autenticação (tem de responder
// mesmo antes de o utilizador ter sessão iniciada).
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async check() {
    let databaseStatus = 'up';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      databaseStatus = 'down';
    }

    return {
      data: {
        status: databaseStatus === 'up' ? 'ok' : 'degraded',
        database: databaseStatus,
        timestamp: new Date().toISOString(),
      },
      message: 'Estado do servidor.',
    };
  }
}
