import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateProviderDto {
  @IsString() name: string;
  @IsString() nif: string;
  @IsIn(['hospital', 'clinic', 'office', 'pharmacy', 'laboratory', 'physiotherapy', 'dentist', 'optics', 'ambulance'])
  type: string;
  @IsOptional() @IsString() licenseNumber?: string;
  @IsOptional() @IsString() responsibleName?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() province?: string;
  @IsOptional() @IsString() municipality?: string;
}
