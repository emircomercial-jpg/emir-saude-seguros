import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthorizationsService } from './authorizations.service';
import { CreateAuthorizationDto } from './dto/create-authorization.dto';
import { DecideAuthorizationDto } from './dto/decide-authorization.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('authorizations')
@Controller('authorizations')
export class AuthorizationsController {
  constructor(private readonly authorizationsService: AuthorizationsService) {}

  @Get()
  @RequirePermissions('authorizations.view')
  async findAll(
    @Query('status') status: string | undefined,
    @Query('insuredMemberId') insuredMemberId: string | undefined,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const data = await this.authorizationsService.findAll(user.organizationId, { status, insuredMemberId });
    return { data, message: 'Lista de autorizações.' };
  }

  @Get(':id')
  @RequirePermissions('authorizations.view')
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.authorizationsService.findOne(id, user.organizationId);
    return { data, message: 'Autorização encontrada.' };
  }

  @Post()
  @RequirePermissions('authorizations.create')
  async create(@Body() dto: CreateAuthorizationDto, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.authorizationsService.create(user.organizationId, dto, user.userId);
    return { data, message: 'Autorização submetida com sucesso.' };
  }

  @Patch(':id/decision')
  @RequirePermissions('authorizations.approve')
  async decide(
    @Param('id') id: string,
    @Body() dto: DecideAuthorizationDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const data = await this.authorizationsService.decide(id, user.organizationId, dto, user.userId);
    return { data, message: 'Decisão registada com sucesso.' };
  }
}
