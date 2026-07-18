import { IsInt, IsNumber, IsOptional, IsUUID } from 'class-validator';

export class DispenseDto {
  @IsUUID() prescriptionId: string;
  @IsOptional() @IsUUID() providerId?: string;
  @IsInt() quantity: number;
  @IsOptional() @IsNumber() value?: number;
}
