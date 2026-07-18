import { IsInt, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreatePrescriptionDto {
  @IsUUID() insuredMemberId: string;
  @IsUUID() medicineId: string;
  @IsOptional() @IsString() prescriberName?: string;
  @IsInt() quantity: number;
  @IsOptional() @IsString() dose?: string;
  @IsOptional() @IsString() frequency?: string;
  @IsOptional() @IsInt() durationDays?: number;
}
