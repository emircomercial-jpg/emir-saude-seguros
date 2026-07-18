import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(8, { message: 'A nova palavra-passe deve ter pelo menos 8 caracteres.' })
  newPassword: string;
}
