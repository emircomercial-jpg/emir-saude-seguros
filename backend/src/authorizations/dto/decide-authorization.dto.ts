import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class DecideAuthorizationDto {
  @IsIn(['in_review', 'awaiting_documents', 'approved', 'partially_approved', 'rejected', 'cancelled'])
  status: string;
  @IsOptional() @IsString() decisionNotes?: string;
  @IsOptional() @IsNumber() approvedValue?: number;
  @IsOptional() @IsString() validUntil?: string;
}
