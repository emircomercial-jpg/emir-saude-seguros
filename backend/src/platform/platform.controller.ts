import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { PlatformService } from './platform.service';
import { PlatformAdminGuard } from './platform-admin.guard';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationStatusDto } from './dto/update-organization-status.dto';
import { SetSubscriptionDto } from './dto/set-subscription.dto';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

// Todos os endpoints exigem administrador da plataforma — nunca basta ser
// Superadministrador de uma empresa cliente normal (ver PlatformAdminGuard).
@Controller('platform')
@UseGuards(PlatformAdminGuard)
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  @Get('organizations')
  async listOrganizations() {
    const data = await this.platformService.listOrganizations();
    return { data, message: 'Empresas clientes.' };
  }

  @Post('organizations')
  async createOrganization(@Body() dto: CreateOrganizationDto, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.platformService.createOrganization(dto, user.userId);
    return { data, message: `Empresa "${data.organization.name}" criada com sucesso — pronta a usar.` };
  }

  @Patch('organizations/:id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationStatusDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const data = await this.platformService.updateOrganizationStatus(id, dto.status, user.userId);
    return { data, message: 'Estado da empresa actualizado com sucesso.' };
  }

  @Patch('organizations/:id/subscription')
  async setSubscription(
    @Param('id') id: string,
    @Body() dto: SetSubscriptionDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const data = await this.platformService.setSubscription(id, dto, user.userId);
    return { data, message: 'Assinatura definida com sucesso.' };
  }

  @Post('organizations/:id/subscription/record-payment')
  async recordPayment(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.platformService.recordSubscriptionPayment(id, user.userId);
    return { data, message: 'Pagamento registado — acesso garantido até ao próximo vencimento.' };
  }
}
