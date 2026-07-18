import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InsuredService } from './insured.service';
import { CreateInsuredDto } from './dto/create-insured.dto';
import { UpdateInsuredDto } from './dto/update-insured.dto';
import { QueryInsuredDto } from './dto/query-insured.dto';
import { CreateDependentDto } from './dto/create-dependent.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('insured')
@Controller('insured')
export class InsuredController {
  constructor(private readonly insuredService: InsuredService) {}

  @Get()
  @RequirePermissions('insured.view')
  async findAll(@Query() query: QueryInsuredDto, @CurrentUser() user: CurrentUserPayload) {
    const { items, meta } = await this.insuredService.findAll(user.organizationId, query);
    return { data: items, meta, message: 'Lista de segurados.' };
  }

  @Get(':id')
  @RequirePermissions('insured.view')
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.insuredService.findOne(id, user.organizationId);
    return { data, message: 'Segurado encontrado.' };
  }

  @Post()
  @RequirePermissions('insured.create')
  async create(@Body() dto: CreateInsuredDto, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.insuredService.create(user.organizationId, dto, user.userId);
    return { data, message: 'Segurado criado com sucesso.' };
  }

  @Patch(':id')
  @RequirePermissions('insured.update')
  async update(@Param('id') id: string, @Body() dto: UpdateInsuredDto, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.insuredService.update(id, user.organizationId, dto, user.userId);
    return { data, message: 'Segurado actualizado com sucesso.' };
  }

  @Delete(':id')
  @RequirePermissions('insured.delete')
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    const result = await this.insuredService.softDelete(id, user.organizationId, user.userId);
    return { data: null, message: result.message };
  }

  @Patch(':id/status')
  @RequirePermissions('insured.update')
  async setStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const data = await this.insuredService.setStatus(id, user.organizationId, body.status, user.userId);
    return { data, message: 'Estado do segurado actualizado.' };
  }

  @Post(':id/dependents')
  @RequirePermissions('dependents.create')
  async addDependent(
    @Param('id') id: string,
    @Body() dto: CreateDependentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const data = await this.insuredService.addDependent(id, user.organizationId, dto, user.userId);
    return { data, message: 'Dependente incluído com sucesso.' };
  }

  @Delete('dependents/:dependentId')
  @RequirePermissions('dependents.delete')
  async removeDependent(@Param('dependentId') dependentId: string, @CurrentUser() user: CurrentUserPayload) {
    const result = await this.insuredService.removeDependent(dependentId, user.organizationId, user.userId);
    return { data: null, message: result.message };
  }
}
