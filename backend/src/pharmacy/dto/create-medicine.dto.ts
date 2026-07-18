import { IsBoolean, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateMedicineDto {
  @IsString() name: string;
  @IsOptional() @IsString() activeIngredient?: string;
  @IsOptional() @IsBoolean() isGeneric?: boolean;
  @IsOptional() @IsBoolean() isCovered?: boolean;
  @IsOptional() @IsBoolean() requiresAuthorization?: boolean;
  @IsOptional() @IsInt() monthlyLimitQuantity?: number;
  @IsOptional() @IsNumber() copaymentPercentage?: number;
}
