import { IsIn } from 'class-validator';

export class UpdateReimbursementStatusDto {
  @IsIn(['submitted', 'under_validation', 'awaiting_documents', 'in_review', 'approved', 'partially_approved', 'rejected', 'paid', 'closed'])
  status: string;
}
