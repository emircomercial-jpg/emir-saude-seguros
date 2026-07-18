import { IsDateString, IsEmail, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCompanyDto {
  @IsString() legalName: string;
  @IsOptional() @IsString() tradeName?: string;
  @IsString() nif: string;
  @IsOptional() @IsString() sector?: string;
  @IsOptional() @IsString() responsibleName?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() province?: string;
  @IsOptional() @IsString() municipality?: string;
  @IsOptional() @IsUUID() planId?: string;
  @IsOptional() @IsString() contractNumber?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsNumber() monthlyValue?: number;
  @IsOptional() @IsString() paymentMode?: string;
}
