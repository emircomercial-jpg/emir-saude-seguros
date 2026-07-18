import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePremiumDto } from './dto/create-premium.dto';
import { RegisterPaymentDto } from './dto/register-payment.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('premiums')
  @RequirePermissions('payments.create')
  async createPremium(@Body() dto: CreatePremiumDto, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.paymentsService.createPremium(user.organizationId, dto, user.userId);
    return { data, message: 'Mensalidade gerada com sucesso.' };
  }

  @Get('premiums')
  @RequirePermissions('payments.view')
  async listPremiums(
    @Query('status') status: string | undefined,
    @Query('insuredMemberId') insuredMemberId: string | undefined,
    @Query('companyId') companyId: string | undefined,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const data = await this.paymentsService.listPremiums(user.organizationId, { status, insuredMemberId, companyId });
    return { data, message: 'Lista de mensalidades.' };
  }

  @Post('pay')
  @RequirePermissions('payments.create')
  async registerPayment(@Body() dto: RegisterPaymentDto, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.paymentsService.registerPayment(user.organizationId, dto, user.userId);
    return { data, message: 'Pagamento registado com sucesso.' };
  }

  @Post('suspend-overdue')
  @RequirePermissions('payments.configure')
  async suspendOverdue(@Body() body: { graceDays?: number }, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.paymentsService.suspendOverdue(user.organizationId, body.graceDays);
    return { data, message: 'Verificação de mensalidades em atraso concluída.' };
  }

  @Get('statement/:insuredMemberId')
  @RequirePermissions('payments.view')
  async getStatement(@Param('insuredMemberId') insuredMemberId: string) {
    const data = await this.paymentsService.getStatement(insuredMemberId);
    return { data, message: 'Extracto de mensalidades.' };
  }
}
