import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCoverageDto {
  @IsString() name: string;
  @IsNumber() coveredPercentage: number;
  @IsOptional() @IsBoolean() requiresAuthorization?: boolean;
}
