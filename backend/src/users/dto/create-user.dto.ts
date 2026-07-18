import { IsArray, IsBoolean, IsEmail, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  fullName: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  // Palavra-passe temporária (secção 9) — nunca fixa no código, definida
  // pelo administrador ao criar o utilizador.
  @IsString()
  @MinLength(8, { message: 'A palavra-passe temporária deve ter pelo menos 8 caracteres.' })
  temporaryPassword: string;

  @IsOptional()
  @IsBoolean()
  mustChangePassword?: boolean;

  @IsArray()
  @IsUUID('4', { each: true })
  roleIds: string[];
}
