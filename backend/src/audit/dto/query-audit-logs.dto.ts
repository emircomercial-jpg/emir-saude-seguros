import { IsOptional, IsString } from 'class-validator';

export class QueryAuditLogsDto {
  @IsOptional() @IsString() userId?: string;
  @IsOptional() @IsString() module?: string;
  @IsOptional() @IsString() action?: string;
  @IsOptional() @IsString() entity?: string;
  @IsOptional() @IsString() from?: string; // ISO date
  @IsOptional() @IsString() to?: string;   // ISO date
  @IsOptional() page?: number;
  @IsOptional() pageSize?: number;
}
