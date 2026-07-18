import { Type } from 'class-transformer';
import { IsArray, IsDefined, IsString, ValidateNested } from 'class-validator';

class SettingItemDto {
  @IsString()
  key: string;

  @IsDefined()
  value: unknown; // JSON — validado ao nível do valor esperado por categoria, se necessário
}

export class UpdateSettingsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SettingItemDto)
  settings: SettingItemDto[];
}
