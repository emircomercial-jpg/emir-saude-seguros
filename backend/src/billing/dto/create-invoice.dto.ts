import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsNumber, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';

class InvoiceItemDto {
  @IsString() description: string;
  @IsOptional() @IsUUID() insuredMemberId?: string;
  @IsNumber() value: number;
}

export class CreateInvoiceDto {
  @IsUUID() providerId: string;
  @IsString() invoiceNumber: string;
  @IsDateString() periodStart: string;
  @IsDateString() periodEnd: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];
}
