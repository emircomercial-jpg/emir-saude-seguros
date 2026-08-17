import { IsBoolean, IsDateString, IsEmail, IsIn, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

// Converte uma string vazia ('') em "nada" (undefined) antes da validação
// — sem isto, um campo opcional deixado em branco no formulário (que
// chega como '' em vez de simplesmente não estar presente) falhava a
// validação de e-mail (formato inválido) ou, no caso do NIF, podia violar
// a restrição de unicidade na base de dados assim que um segundo registo
// também ficasse com nif: '' (duas strings vazias "iguais" entre si).
// Bug real, encontrado porque um registo estava a falhar sempre que o
// e-mail ficava em branco.
const emptyStringToUndefined = ({ value }: { value: unknown }) => (value === '' ? undefined : value);

export class CreateInsuredDto {
  @IsString() fullName: string;
  @IsDateString() birthDate: string;
  @IsIn(['M', 'F']) sex: string;
  @IsOptional() @IsString() maritalStatus?: string;
  @IsOptional() @IsString() nationality?: string;
  @IsString() idDocumentNumber: string;
  @IsOptional() @IsDateString() idIssueDate?: string;
  @IsOptional() @IsDateString() idExpiryDate?: string;
  @IsOptional() @Transform(emptyStringToUndefined) @IsString() nif?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() altPhone?: string;
  // Consentimento explícito para notificações automáticas por WhatsApp
  // neste número — nunca activado por omissão.
  @IsOptional() @IsBoolean() whatsappOptIn?: boolean;
  @IsOptional() @Transform(emptyStringToUndefined) @IsEmail() email?: string;
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
