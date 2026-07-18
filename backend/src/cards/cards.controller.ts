import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CardsService } from './cards.service';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('cards')
@Controller('cards')
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  // Validação rápida (secção 9): qualquer utilizador autenticado com a
  // permissão cards.view pode validar um cartão — não exige permissões
  // administrativas mais amplas, para que o atendimento possa usá-la.
  @Get('validate')
  @RequirePermissions('cards.view')
  async validate(
    @Query('cardNumber') cardNumber: string | undefined,
    @Query('idDocumentNumber') idDocumentNumber: string | undefined,
    @Query('qrToken') qrToken: string | undefined,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const data = await this.cardsService.validate(user.organizationId, { cardNumber, idDocumentNumber, qrToken });
    return { data, message: 'Segurado validado com sucesso.' };
  }

  @Get('insured/:insuredMemberId')
  @RequirePermissions('cards.view')
  async listByInsured(@Param('insuredMemberId') insuredMemberId: string, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.cardsService.listByInsured(insuredMemberId, user.organizationId);
    return { data, message: 'Cartões do segurado.' };
  }

  @Post('insured/:insuredMemberId/issue')
  @RequirePermissions('cards.create')
  async issue(@Param('insuredMemberId') insuredMemberId: string, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.cardsService.issue(insuredMemberId, user.organizationId, user.userId);
    return { data, message: 'Cartão emitido com sucesso.' };
  }

  @Post(':id/block')
  @RequirePermissions('cards.update')
  async block(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.cardsService.block(id, user.organizationId, user.userId);
    return { data, message: 'Cartão bloqueado.' };
  }

  @Post(':id/report-lost')
  @RequirePermissions('cards.update')
  async reportLost(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.cardsService.reportLost(id, user.organizationId, user.userId);
    return { data, message: 'Perda do cartão registada.' };
  }

  @Post(':id/report-stolen')
  @RequirePermissions('cards.update')
  async reportStolen(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.cardsService.reportStolen(id, user.organizationId, user.userId);
    return { data, message: 'Roubo do cartão registado.' };
  }

  @Post(':id/replace')
  @RequirePermissions('cards.create')
  async replace(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.cardsService.replace(id, user.organizationId, user.userId);
    return { data, message: 'Segunda via emitida com sucesso.' };
  }
}
