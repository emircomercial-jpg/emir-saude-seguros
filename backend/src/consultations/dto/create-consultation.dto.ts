import { IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateConsultationDto {
  @IsUUID() insuredMemberId: string;
  @IsOptional() @IsUUID() providerId?: string;
  @IsOptional() @IsString() doctorName?: string;
  @IsOptional() @IsString() specialty?: string;
  @IsOptional() @IsString() consultationType?: string;
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsString() diagnosisCode?: string;
  @IsOptional() @IsString() diagnosisDescription?: string;
  @IsOptional() @IsNumber() totalValue?: number;
}
