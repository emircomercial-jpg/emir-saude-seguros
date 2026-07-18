import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('companies')
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  @RequirePermissions('companies.view')
  async findAll(
    @Query('search') search: string | undefined,
    @Query('page') page: number | undefined,
    @Query('pageSize') pageSize: number | undefined,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const { items, meta } = await this.companiesService.findAll(user.organizationId, { search, page, pageSize });
    return { data: items, meta, message: 'Lista de empresas clientes.' };
  }

  @Get(':id')
  @RequirePermissions('companies.view')
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.companiesService.findOne(id, user.organizationId);
    return { data, message: 'Empresa encontrada.' };
  }

  @Post()
  @RequirePermissions('companies.create')
  async create(@Body() dto: CreateCompanyDto, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.companiesService.create(user.organizationId, dto, user.userId);
    return { data, message: 'Empresa criada com sucesso.' };
  }

  @Patch(':id')
  @RequirePermissions('companies.update')
  async update(@Param('id') id: string, @Body() dto: UpdateCompanyDto, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.companiesService.update(id, user.organizationId, dto, user.userId);
    return { data, message: 'Empresa actualizada com sucesso.' };
  }

  @Patch(':id/status')
  @RequirePermissions('companies.update')
  async setStatus(
    @Param('id') id: string,
    @Body() body: { status: 'active' | 'suspended' | 'cancelled' },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const data = await this.companiesService.setStatus(id, user.organizationId, body.status, user.userId);
    return { data, message: 'Estado da empresa actualizado.' };
  }

  @Delete(':id')
  @RequirePermissions('companies.delete')
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    const result = await this.companiesService.remove(id, user.organizationId, user.userId);
    return { data: null, message: result.message };
  }
}
