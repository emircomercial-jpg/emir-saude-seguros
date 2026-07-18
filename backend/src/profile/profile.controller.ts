import { Body, Controller, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UsersService } from '../users/users.service';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

// "Meu Perfil" (secção 21 do briefing). A visualização usa GET /api/auth/me
// (já existente); este módulo cobre apenas a actualização dos dados não
// sensíveis (nome, telefone, fotografia). Alteração de palavra-passe,
// dispositivos e "terminar sessão noutros dispositivos" já estão cobertos
// por /api/auth/change-password, /api/auth/devices e /api/auth/logout-all.
// Um utilizador nunca pode alterar as próprias permissões através daqui.
@ApiTags('profile')
@Controller('profile')
export class ProfileController {
  constructor(private readonly usersService: UsersService) {}

  @Patch()
  @RequirePermissions('profile.update')
  async updateOwnProfile(@Body() dto: UpdateUserDto, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.usersService.updateOwnProfile(user.userId, user.organizationId, dto);
    return { data, message: 'Perfil actualizado com sucesso.' };
  }
}
