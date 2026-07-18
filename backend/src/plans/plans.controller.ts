import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PlansService } from './plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { CreateCoverageDto } from './dto/create-coverage.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('plans')
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  @RequirePermissions('plans.view')
  async findAll(@CurrentUser() user: CurrentUserPayload) {
    const data = await this.plansService.findAll(user.organizationId);
    return { data, message: 'Lista de planos de saúde.' };
  }

  @Get(':id')
  @RequirePermissions('plans.view')
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.plansService.findOne(id, user.organizationId);
    return { data, message: 'Plano encontrado.' };
  }

  @Post()
  @RequirePermissions('plans.create')
  async create(@Body() dto: CreatePlanDto, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.plansService.create(user.organizationId, dto, user.userId);
    return { data, message: 'Plano criado com sucesso.' };
  }

  @Patch(':id')
  @RequirePermissions('plans.update')
  async update(@Param('id') id: string, @Body() dto: UpdatePlanDto, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.plansService.update(id, user.organizationId, dto, user.userId);
    return { data, message: 'Plano actualizado com sucesso.' };
  }

  @Patch(':id/status')
  @RequirePermissions('plans.update')
  async setStatus(
    @Param('id') id: string,
    @Body() body: { status: 'active' | 'inactive' },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const data = await this.plansService.setStatus(id, user.organizationId, body.status, user.userId);
    return { data, message: 'Estado do plano actualizado.' };
  }

  @Delete(':id')
  @RequirePermissions('plans.delete')
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    const result = await this.plansService.remove(id, user.organizationId, user.userId);
    return { data: null, message: result.message };
  }

  @Post(':id/coverages')
  @RequirePermissions('plans.configure')
  async addCoverage(
    @Param('id') id: string,
    @Body() dto: CreateCoverageDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const data = await this.plansService.addCoverage(id, user.organizationId, dto, user.userId);
    return { data, message: 'Cobertura adicionada com sucesso.' };
  }

  @Delete(':id/coverages/:coverageId')
  @RequirePermissions('plans.configure')
  async removeCoverage(
    @Param('id') id: string,
    @Param('coverageId') coverageId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const result = await this.plansService.removeCoverage(id, coverageId, user.organizationId, user.userId);
    return { data: null, message: result.message };
  }
}
