import { IsIn, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class RegisterPaymentDto {
  @IsUUID() premiumId: string;
  @IsNumber() amount: number;
  @IsIn(['bank_debit', 'transfer', 'cash', 'payment_reference', 'mobile_wallet'])
  method: string;
  @IsOptional() @IsString() receiptNumber?: string;
}
