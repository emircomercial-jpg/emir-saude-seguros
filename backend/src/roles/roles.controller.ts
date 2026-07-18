import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('roles')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions('roles.view')
  async findAll(@CurrentUser() user: CurrentUserPayload) {
    const data = await this.rolesService.findAll(user.organizationId);
    return { data, message: 'Lista de perfis.' };
  }

  @Get(':id')
  @RequirePermissions('roles.view')
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.rolesService.findOne(id, user.organizationId);
    return { data, message: 'Perfil encontrado.' };
  }

  @Post()
  @RequirePermissions('roles.create')
  async create(@Body() dto: CreateRoleDto, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.rolesService.create(user.organizationId, dto, user.userId);
    return { data, message: 'Perfil criado com sucesso.' };
  }

  @Patch(':id')
  @RequirePermissions('roles.update')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const data = await this.rolesService.update(id, user.organizationId, dto, user.userId);
    return { data, message: 'Perfil actualizado com sucesso.' };
  }

  @Delete(':id')
  @RequirePermissions('roles.delete')
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    const result = await this.rolesService.remove(id, user.organizationId, user.userId);
    return { data: null, message: result.message };
  }

  @Patch(':id/status')
  @RequirePermissions('roles.update')
  async setStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const data = await this.rolesService.setStatus(id, user.organizationId, dto.status, user.userId);
    return { data, message: 'Estado do perfil actualizado.' };
  }

  @Patch(':id/permissions')
  @RequirePermissions('roles.update')
  async assignPermissions(
    @Param('id') id: string,
    @Body() dto: AssignPermissionsDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const data = await this.rolesService.assignPermissions(id, user.organizationId, dto.permissionIds, user.userId);
    return { data, message: 'Permissões do perfil actualizadas.' };
  }
}
