import { IsIn, IsISO8601, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

const emptyStringToUndefined = ({ value }: { value: unknown }) => (value === '' ? undefined : value);

export class CreateAgreementDto {
  @IsString() agencyName: string;
  @IsOptional() @Transform(emptyStringToUndefined) @IsString() agencyNif?: string;
  @IsIn(['reciprocal_coverage', 'reinsurance', 'referral', 'co_insurance', 'other']) agreementType: string;
  @IsOptional() @IsString() contactName?: string;
  @IsOptional() @Transform(emptyStringToUndefined) @IsString() contactEmail?: string;
  @IsOptional() @IsString() contactPhone?: string;
  @IsISO8601() startDate: string;
  @IsOptional() @IsISO8601() endDate?: string;
  @IsOptional() @IsString() scope?: string;
  @IsOptional() @IsString() notes?: string;
}
