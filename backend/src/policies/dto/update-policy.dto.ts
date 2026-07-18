import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdatePolicyDto {
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsNumber() value?: number;
  @IsOptional() @IsString() paymentMode?: string;
}
