import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions('users.view')
  async findAll(@Query() query: QueryUsersDto, @CurrentUser() user: CurrentUserPayload) {
    const { items, meta } = await this.usersService.findAll(user.organizationId, query);
    return { data: items, meta, message: 'Lista de utilizadores.' };
  }

  @Get(':id')
  @RequirePermissions('users.view')
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.usersService.findOne(id, user.organizationId);
    return { data, message: 'Utilizador encontrado.' };
  }

  @Post()
  @RequirePermissions('users.create')
  async create(@Body() dto: CreateUserDto, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.usersService.create(user.organizationId, dto, user.userId);
    return { data, message: 'Utilizador criado com sucesso.' };
  }

  @Patch(':id')
  @RequirePermissions('users.update')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const data = await this.usersService.update(id, user.organizationId, dto, user.userId);
    return { data, message: 'Utilizador actualizado com sucesso.' };
  }

  @Delete(':id')
  @RequirePermissions('users.delete')
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    const result = await this.usersService.softDelete(id, user.organizationId, user.userId);
    return { data: null, message: result.message };
  }

  @Patch(':id/activate')
  @RequirePermissions('users.activate')
  async activate(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.usersService.activate(id, user.organizationId, user.userId);
    return { data, message: 'Utilizador activado.' };
  }

  @Patch(':id/suspend')
  @RequirePermissions('users.suspend')
  async suspend(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.usersService.suspend(id, user.organizationId, user.userId);
    return { data, message: 'Utilizador suspenso.' };
  }

  @Patch(':id/block')
  @RequirePermissions('users.block')
  async block(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.usersService.block(id, user.organizationId, user.userId);
    return { data, message: 'Utilizador bloqueado.' };
  }

  @Patch(':id/restore')
  @RequirePermissions('users.restore')
  async restore(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.usersService.restore(id, user.organizationId, user.userId);
    return { data, message: 'Utilizador restaurado.' };
  }

  @Patch(':id/roles')
  @RequirePermissions('users.update')
  async assignRoles(
    @Param('id') id: string,
    @Body() dto: AssignRolesDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const data = await this.usersService.assignRoles(id, user.organizationId, dto.roleIds, user.userId);
    return { data, message: 'Perfis do utilizador actualizados.' };
  }

  @Post(':id/reset-password')
  @RequirePermissions('users.update')
  async resetPassword(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    const result = await this.usersService.resetPassword(id, user.organizationId, user.userId);
    return { data: null, message: result.message };
  }

  @Get(':id/audit-logs')
  @RequirePermissions('users.view', 'audit.view')
  async auditLogs(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.usersService.auditLogs(id, user.organizationId);
    return { data, message: 'Histórico de alterações do utilizador.' };
  }

  @Get(':id/devices')
  @RequirePermissions('users.view')
  async devices(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.usersService.devices(id, user.organizationId);
    return { data, message: 'Dispositivos do utilizador.' };
  }

  @Patch(':id/link-insured')
  @RequirePermissions('users.update')
  async linkToInsured(
    @Param('id') id: string,
    @Body() body: { insuredMemberId: string | null },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const data = await this.usersService.linkToInsured(id, user.organizationId, body.insuredMemberId, user.userId);
    return { data, message: 'Ligação ao portal do segurado actualizada.' };
  }

  @Patch(':id/link-provider')
  @RequirePermissions('users.update')
  async linkToProvider(
    @Param('id') id: string,
    @Body() body: { providerId: string | null },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const data = await this.usersService.linkToProvider(id, user.organizationId, body.providerId, user.userId);
    return { data, message: 'Ligação ao portal do prestador actualizada.' };
  }
}
