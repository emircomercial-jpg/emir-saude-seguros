import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AgreementsService } from './agreements.service';
import { CreateAgreementDto } from './dto/create-agreement.dto';
import { UpdateAgreementDto } from './dto/update-agreement.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@Controller('agreements')
export class AgreementsController {
  constructor(private readonly agreementsService: AgreementsService) {}

  @Get()
  @RequirePermissions('agreements.view')
  async findAll(@CurrentUser() user: CurrentUserPayload, @Query('status') status?: string) {
    const data = await this.agreementsService.findAll(user.organizationId, status);
    return { data, message: 'Convénios com outras seguradoras.' };
  }

  @Get(':id')
  @RequirePermissions('agreements.view')
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.agreementsService.findOne(id, user.organizationId);
    return { data, message: 'Convénio encontrado.' };
  }

  @Post()
  @RequirePermissions('agreements.create')
  async create(@Body() dto: CreateAgreementDto, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.agreementsService.create(user.organizationId, dto, user.userId);
    return { data, message: 'Convénio criado com sucesso.' };
  }

  @Patch(':id')
  @RequirePermissions('agreements.update')
  async update(@Param('id') id: string, @Body() dto: UpdateAgreementDto, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.agreementsService.update(id, user.organizationId, dto, user.userId);
    return { data, message: 'Convénio actualizado com sucesso.' };
  }

  @Delete(':id')
  @RequirePermissions('agreements.delete')
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    await this.agreementsService.remove(id, user.organizationId, user.userId);
    return { data: null, message: 'Convénio removido com sucesso.' };
  }
}
