import { IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreatePlanDto {
  @IsString() name: string;
  @IsString() code: string;
  @IsOptional() @IsString() description?: string;
  @IsNumber() monthlyValue: number;
  @IsOptional() @IsNumber() annualLimit?: number;
  @IsOptional() @IsInt() minAge?: number;
  @IsOptional() @IsInt() maxAge?: number;
  @IsOptional() @IsInt() maxDependents?: number;
  @IsOptional() @IsInt() waitingPeriodDays?: number;
  @IsOptional() @IsNumber() deductible?: number;
  @IsOptional() @IsNumber() copaymentPercentage?: number;
}
