import { PartialType } from '@nestjs/mapped-types';
import { IsIn, IsOptional } from 'class-validator';
import { CreateAgreementDto } from './create-agreement.dto';

export class UpdateAgreementDto extends PartialType(CreateAgreementDto) {
  @IsOptional() @IsIn(['active', 'suspended', 'expired', 'cancelled']) status?: string;
}
