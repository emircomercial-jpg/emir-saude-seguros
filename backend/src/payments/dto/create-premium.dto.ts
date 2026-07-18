import { IsDateString, IsNumber, IsOptional, IsUUID } from 'class-validator';

export class CreatePremiumDto {
  @IsOptional() @IsUUID() insuredMemberId?: string;
  @IsOptional() @IsUUID() companyId?: string;
  @IsOptional() @IsUUID() policyId?: string;
  @IsDateString() referenceMonth: string;
  @IsDateString() dueDate: string;
  @IsNumber() value: number;
}
