import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateInsuredDto } from './create-insured.dto';

export class UpdateInsuredDto extends PartialType(
  OmitType(CreateInsuredDto, ['idDocumentNumber'] as const),
) {}
