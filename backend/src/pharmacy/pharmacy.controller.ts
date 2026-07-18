import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PharmacyService } from './pharmacy.service';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { DispenseDto } from './dto/dispense.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('pharmacy')
@Controller('pharmacy')
export class PharmacyController {
  constructor(private readonly pharmacyService: PharmacyService) {}

  @Get('medicines')
  @RequirePermissions('pharmacy.view')
  async listMedicines(@Query('search') search: string | undefined, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.pharmacyService.listMedicines(user.organizationId, search);
    return { data, message: 'Catálogo de medicamentos.' };
  }

  @Post('medicines')
  @RequirePermissions('pharmacy.configure')
  async createMedicine(@Body() dto: CreateMedicineDto, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.pharmacyService.createMedicine(user.organizationId, dto);
    return { data, message: 'Medicamento adicionado ao catálogo.' };
  }

  @Post('prescriptions')
  @RequirePermissions('pharmacy.create')
  async createPrescription(@Body() dto: CreatePrescriptionDto, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.pharmacyService.createPrescription(user.organizationId, dto, user.userId);
    return { data, message: 'Prescrição registada com sucesso.' };
  }

  @Post('dispenses')
  @RequirePermissions('pharmacy.create')
  async dispense(@Body() dto: DispenseDto, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.pharmacyService.dispense(user.organizationId, dto, user.userId);
    return { data, message: 'Medicamento dispensado com sucesso.' };
  }

  @Get('dispenses')
  @RequirePermissions('pharmacy.view')
  async listDispenses(@Query('insuredMemberId') insuredMemberId: string) {
    const data = await this.pharmacyService.listDispensesByInsured(insuredMemberId);
    return { data, message: 'Histórico de dispensações.' };
  }
}
