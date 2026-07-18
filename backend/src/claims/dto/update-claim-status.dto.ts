import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateClaimStatusDto {
  @IsIn(['submitted', 'triage', 'in_review', 'clinical_audit', 'financial_audit', 'approved', 'rejected', 'paid', 'closed'])
  status: string;
  @IsOptional() @IsString() analystNotes?: string;
  @IsOptional() @IsNumber() approvedValue?: number;
}
