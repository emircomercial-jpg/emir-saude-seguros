import { IsIn, IsOptional, IsString } from 'class-validator';

export class QueryInsuredDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional()
  @IsIn(['active', 'suspended', 'inactive', 'cancelled', 'waiting_period', 'expired', 'pending_approval', 'blocked_nonpayment'])
  status?: string;
  @IsOptional() page?: number;
  @IsOptional() pageSize?: number;
}
