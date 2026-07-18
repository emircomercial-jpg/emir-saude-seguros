import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateDependentDto {
  @IsIn(['spouse', 'child', 'parent', 'sibling', 'other'])
  relationship: string;
  @IsString() fullName: string;
  @IsDateString() birthDate: string;
  @IsIn(['M', 'F']) sex: string;
  @IsOptional() @IsString() idDocumentNumber?: string;
  @IsOptional() @IsString() phone?: string;
}
