import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { ApplyDeductionsDto } from './dto/apply-deductions.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('billing')
@Controller('billing/invoices')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get()
  @RequirePermissions('billing.view')
  async findAll(@Query('status') status: string | undefined, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.billingService.findAll(user.organizationId, status);
    return { data, message: 'Lista de facturas.' };
  }

  @Get(':id')
  @RequirePermissions('billing.view')
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.billingService.findOne(id, user.organizationId);
    return { data, message: 'Factura encontrada.' };
  }

  @Post()
  @RequirePermissions('billing.create')
  async create(@Body() dto: CreateInvoiceDto, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.billingService.create(user.organizationId, dto, user.userId);
    return { data, message: 'Factura submetida com sucesso.' };
  }

  @Patch(':id/deductions')
  @RequirePermissions('billing.approve')
  async applyDeductions(
    @Param('id') id: string,
    @Body() dto: ApplyDeductionsDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const data = await this.billingService.applyDeductions(id, user.organizationId, dto, user.userId);
    return { data, message: 'Glosas aplicadas com sucesso.' };
  }

  @Patch(':id/status')
  @RequirePermissions('billing.approve')
  async setStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const data = await this.billingService.setStatus(id, user.organizationId, body.status, user.userId);
    return { data, message: 'Estado da factura actualizado.' };
  }
}
