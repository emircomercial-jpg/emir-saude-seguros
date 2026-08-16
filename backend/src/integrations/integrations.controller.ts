import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { IntegrationsService } from './integrations.service';
import { ApiKeyGuard } from './api-key.guard';
import { ReceiveInvoiceDto } from './dto/receive-invoice.dto';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  // ---------- Chamado por um sistema EXTERNO (nunca por um utilizador humano) ----------
  // @Public() dispensa o login normal (JwtAuthGuard); o ApiKeyGuard aplicado
  // a seguir exige, em vez disso, uma chave de integração válida.
  @Public()
  @UseGuards(ApiKeyGuard)
  @Post('invoices/webhook')
  async receiveInvoice(@Body() dto: ReceiveInvoiceDto, @Req() req: any) {
    const data = await this.integrationsService.receiveInvoice(req.integration.organizationId, dto);
    return { data, message: 'Factura recebida com sucesso.' };
  }

  // ---------- Usado pela equipa dentro da aplicação (login normal) ----------

  @RequirePermissions('integrations.view')
  @Get('invoices')
  async listInvoices(
    @CurrentUser() user: CurrentUserPayload,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const result = await this.integrationsService.listExternalInvoices(user.organizationId, {
      status,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
    return { data: result.items, meta: result.meta, message: 'Facturas externas.' };
  }

  @RequirePermissions('integrations.view')
  @Get('invoices/:externalId')
  async getInvoice(@CurrentUser() user: CurrentUserPayload, @Param('externalId') externalId: string) {
    const data = await this.integrationsService.getExternalInvoice(user.organizationId, externalId);
    return { data, message: 'Factura externa.' };
  }

  @RequirePermissions('integrations.manage')
  @Post('api-keys')
  async createApiKey(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateApiKeyDto) {
    const data = await this.integrationsService.createApiKey(user.organizationId, dto.name, user.userId);
    return {
      data,
      message: 'Chave de integração criada — copie-a agora, não será mostrada novamente.',
    };
  }

  @RequirePermissions('integrations.manage')
  @Get('api-keys')
  async listApiKeys(@CurrentUser() user: CurrentUserPayload) {
    const data = await this.integrationsService.listApiKeys(user.organizationId);
    return { data, message: 'Chaves de integração.' };
  }

  @RequirePermissions('integrations.manage')
  @Delete('api-keys/:id')
  async revokeApiKey(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    const data = await this.integrationsService.revokeApiKey(user.organizationId, id, user.userId);
    return { data, message: 'Chave de integração revogada.' };
  }
}
