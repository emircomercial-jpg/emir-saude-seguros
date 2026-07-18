import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';

class DeductionItemDto {
  @IsUUID() itemId: string;
  @IsNumber() deduction: number;
  @IsOptional() @IsString() reason?: string;
}

export class ApplyDeductionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeductionItemDto)
  deductions: DeductionItemDto[];
}
