import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InsuredService } from './insured.service';
import { CreateInsuredDto } from './dto/create-insured.dto';
import { UpdateInsuredDto } from './dto/update-insured.dto';
import { QueryInsuredDto } from './dto/query-insured.dto';
import { CreateDependentDto } from './dto/create-dependent.dto';
import { RegisterInsuredDto } from './dto/register-insured.dto';
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

  // Pesquisa prática por BI, para preencher o formulário de registo
  // automaticamente quando a pessoa já existe no sistema. TEM de estar
  // declarada antes de "@Get(':id')" — caso contrário o NestJS
  // interpretaria "lookup" como se fosse o próprio :id.
  @Get('lookup/by-document/:idDocumentNumber')
  @RequirePermissions('insured.create')
  async lookupByDocument(@Param('idDocumentNumber') idDocumentNumber: string, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.insuredService.lookupByDocument(user.organizationId, idDocumentNumber);
    return { data, message: data.found ? 'Registo encontrado.' : 'Nenhum registo encontrado — pessoa nova.' };
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

  // Registo prático "tudo num só ecrã": cria o Segurado, obriga a escolha
  // de um Plano (do qual nasce logo uma Apólice), emite de imediato o
  // Cartão de Seguro, e inclui os Dependentes indicados — tudo numa única
  // transacção (ou fica tudo criado, ou nada fica).
  @Post('register')
  @RequirePermissions('insured.create')
  async registerComplete(@Body() dto: RegisterInsuredDto, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.insuredService.registerComplete(user.organizationId, dto, user.userId);
    return { data, message: `Segurado registado com sucesso — apólice ${data.policy.policyNumber} e cartão ${data.card.cardNumber} emitidos.` };
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
