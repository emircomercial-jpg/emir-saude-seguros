import { IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateReimbursementDto {
  @IsUUID() insuredMemberId: string;
  @IsOptional() @IsString() description?: string;
  @IsNumber() requestedValue: number;
  @IsOptional() @IsString() bankDetails?: string;
}
