import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateOrganizationDto {
  @IsString() @MinLength(2) name: string;
  @IsOptional() @IsString() legalName?: string;
  @IsOptional() @IsString() nif?: string;
  @IsOptional() @IsString() phone?: string;

  // Primeiro utilizador administrador desta nova empresa.
  @IsString() @MinLength(2) adminFullName: string;
  @IsEmail() adminEmail: string;
  @MinLength(8) adminPassword: string;
}
