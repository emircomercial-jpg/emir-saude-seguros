import { IsArray, IsIn, IsISO8601, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class InvoiceItemDto {
  @IsString() description: string;
  @IsNumber() @Min(0) quantity: number;
  @IsNumber() @Min(0) unitValue: number;
  @IsNumber() @Min(0) totalValue: number;
}

// Contrato de recepção de facturas de um sistema externo — corresponde
// exactamente ao formato descrito ao agente do sistema de facturação
// (ver documentation/external-billing-integration.md).
export class ReceiveInvoiceDto {
  @IsString() externalId: string;
  @IsString() invoiceNumber: string;
  @IsString() customerName: string;
  @IsOptional() @IsString() customerTaxId?: string;
  @IsISO8601() issueDate: string;
  @IsOptional() @IsISO8601() dueDate?: string;
  @IsNumber() @Min(0) totalValue: number;
  @IsIn(['draft', 'issued', 'paid', 'cancelled']) status: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => InvoiceItemDto) items?: InvoiceItemDto[];
}
