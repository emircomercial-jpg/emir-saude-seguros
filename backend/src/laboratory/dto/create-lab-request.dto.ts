import { IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateLabRequestDto {
  @IsUUID() insuredMemberId: string;
  @IsOptional() @IsUUID() providerId?: string;
  @IsOptional() @IsString() requestingDoctor?: string;
  @IsString() examName: string;
  @IsOptional() @IsString() examCode?: string;
  @IsOptional() @IsString() diagnosisCode?: string;
  @IsOptional() @IsNumber() value?: number;
}
