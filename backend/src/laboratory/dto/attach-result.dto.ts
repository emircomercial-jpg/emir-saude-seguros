import { IsOptional, IsString } from 'class-validator';

export class AttachResultDto {
  @IsString() resultAttachmentUrl: string;
  @IsOptional() @IsString() notes?: string;
}
