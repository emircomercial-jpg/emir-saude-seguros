import { IsIn, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateAuthorizationDto {
  @IsUUID() insuredMemberId: string;
  @IsOptional() @IsUUID() providerId?: string;
  @IsOptional() @IsString() requestingDoctor?: string;
  @IsIn([
    'consulta_especializada', 'exame', 'internamento', 'cirurgia',
    'medicamento_alto_custo', 'tratamento_prolongado', 'fisioterapia',
    'odontologia', 'evacuacao', 'procedimento_especial',
  ])
  type: string;
  @IsOptional() @IsString() diagnosisCode?: string;
  @IsOptional() @IsString() clinicalJustification?: string;
  @IsOptional() @IsString() requestedProcedure?: string;
  @IsOptional() @IsNumber() budget?: number;
  @IsOptional() @IsIn(['normal', 'urgent']) priority?: string;
}
