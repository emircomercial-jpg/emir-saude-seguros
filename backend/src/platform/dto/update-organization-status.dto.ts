import { IsIn } from 'class-validator';

export class UpdateOrganizationStatusDto {
  @IsIn(['active', 'suspended', 'inactive']) status: 'active' | 'suspended' | 'inactive';
}
