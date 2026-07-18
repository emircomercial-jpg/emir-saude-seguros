import { IsDateString, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateClaimDto {
  @IsUUID() insuredMemberId: string;
  @IsOptional() @IsUUID() policyId?: string;
  @IsOptional() @IsUUID() providerId?: string;
  @IsOptional() @IsString() occurrenceType?: string;
  @IsOptional() @IsDateString() occurrenceDate?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() diagnosis?: string;
  @IsOptional() @IsNumber() requestedValue?: number;
}
