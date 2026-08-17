import { IsArray, IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateInsuredDto } from './create-insured.dto';
import { CreateDependentDto } from './create-dependent.dto';

// Registo completo e prático de um novo integrante: cria o Segurado, obriga
// a escolha de um Plano (do qual nasce automaticamente uma Apólice), emite
// logo o Cartão de Seguro, e permite incluir os dependentes desde já — tudo
// numa única acção/ecrã, em vez de obrigar a passar por três páginas
// diferentes (Segurados → Apólices → Cartões).
export class RegisterInsuredDto extends CreateInsuredDto {
  @IsUUID() planId: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDependentDto)
  dependents?: CreateDependentDto[];
}
