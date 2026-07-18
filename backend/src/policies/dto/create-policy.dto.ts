import { IsArray, IsDateString, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreatePolicyDto {
  @IsUUID() planId: string;
  @IsOptional() @IsUUID() companyId?: string;
  @IsDateString() issueDate: string;
  @IsDateString() startDate: string;
  @IsDateString() endDate: string;
  @IsNumber() value: number;
  @IsString() paymentMode: string;
  @IsOptional() @IsArray() @IsUUID('4', { each: true }) insuredMemberIds?: string[];
}
