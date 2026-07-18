import { IsBoolean, IsDateString, IsEmail, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateInsuredDto {
  @IsString() fullName: string;
  @IsDateString() birthDate: string;
  @IsIn(['M', 'F']) sex: string;
  @IsOptional() @IsString() maritalStatus?: string;
  @IsOptional() @IsString() nationality?: string;
  @IsString() idDocumentNumber: string;
  @IsOptional() @IsDateString() idIssueDate?: string;
  @IsOptional() @IsDateString() idExpiryDate?: string;
  @IsOptional() @IsString() nif?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() altPhone?: string;
  // Consentimento explícito para notificações automáticas por WhatsApp
  // neste número — nunca activado por omissão.
  @IsOptional() @IsBoolean() whatsappOptIn?: boolean;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() province?: string;
  @IsOptional() @IsString() municipality?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() profession?: string;
  @IsOptional() @IsString() employer?: string;
  @IsOptional() @IsString() bloodType?: string;
  @IsOptional() @IsString() emergencyContact?: string;
  @IsOptional() @IsString() emergencyRelation?: string;
  @IsOptional() @IsDateString() joinDate?: string;
  @IsOptional() @IsDateString() coverageStartDate?: string;
  @IsOptional() @IsDateString() coverageEndDate?: string;
  @IsOptional() @IsString() notes?: string;
}
