import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProvidersService } from './providers.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('providers')
@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Get()
  @RequirePermissions('providers.view')
  async findAll(
    @Query('type') type: string | undefined,
    @Query('search') search: string | undefined,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const data = await this.providersService.findAll(user.organizationId, { type, search });
    return { data, message: 'Lista de prestadores.' };
  }

  @Get(':id')
  @RequirePermissions('providers.view')
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.providersService.findOne(id, user.organizationId);
    return { data, message: 'Prestador encontrado.' };
  }

  @Post()
  @RequirePermissions('providers.create')
  async create(@Body() dto: CreateProviderDto, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.providersService.create(user.organizationId, dto, user.userId);
    return { data, message: 'Prestador criado com sucesso.' };
  }

  @Patch(':id')
  @RequirePermissions('providers.update')
  async update(@Param('id') id: string, @Body() dto: UpdateProviderDto, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.providersService.update(id, user.organizationId, dto, user.userId);
    return { data, message: 'Prestador actualizado com sucesso.' };
  }

  @Patch(':id/status')
  @RequirePermissions('providers.update')
  async setStatus(
    @Param('id') id: string,
    @Body() body: { status: 'active' | 'suspended' | 'under_review' },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const data = await this.providersService.setStatus(id, user.organizationId, body.status, user.userId);
    return { data, message: 'Estado do prestador actualizado.' };
  }

  @Delete(':id')
  @RequirePermissions('providers.delete')
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    const result = await this.providersService.remove(id, user.organizationId, user.userId);
    return { data: null, message: result.message };
  }
}
