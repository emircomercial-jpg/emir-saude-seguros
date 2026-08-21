import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

const REFRESH_COOKIE_NAME = 'refreshToken';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  private requestContext(req: Request) {
    return {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };
  }

  // Grava o refresh token como cookie HTTP-only e assinado — nunca acessível
  // via JavaScript no browser, e portanto nunca guardado no localStorage
  // (secção 7 do briefing).
  //
  // sameSite: em produção usa-se 'none' (com secure:true, exigido pelos
  // browsers sempre que sameSite é 'none') porque o frontend e o backend
  // ficam tipicamente em domínios diferentes quando alojados em
  // plataformas gratuitas separadas (ex: frontend em Cloudflare
  // Pages/Vercel, backend em Render) — um cookie 'lax' nunca seria enviado
  // de volta nesse cenário, fazendo a sessão parecer iniciar mas nunca
  // persistir. Em desenvolvimento local mantém-se 'lax', mais permissivo
  // para chamadas sem HTTPS.
  private setRefreshCookie(res: Response, token: string, maxAgeMs: number) {
    const isProduction = this.config.get<string>('nodeEnv') === 'production';
    res.cookie(REFRESH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      signed: true,
      maxAge: maxAgeMs,
      path: '/api/auth',
    });
  }

  private clearRefreshCookie(res: Response) {
    const isProduction = this.config.get<string>('nodeEnv') === 'production';
    res.clearCookie(REFRESH_COOKIE_NAME, {
      path: '/api/auth',
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
    });
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto, this.requestContext(req));
    this.setRefreshCookie(res, result.refreshToken, result.refreshTokenExpiresInMs);

    return {
      data: { accessToken: result.accessToken, user: result.user },
      message: 'Sessão iniciada com sucesso.',
    };
  }

  @Public()
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawToken = req.signedCookies?.[REFRESH_COOKIE_NAME];
    const result = await this.authService.refresh(rawToken, this.requestContext(req));
    this.setRefreshCookie(res, result.refreshToken, result.refreshTokenExpiresInMs);

    return {
      data: { accessToken: result.accessToken },
      message: 'Sessão renovada com sucesso.',
    };
  }

  @Public()
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawToken = req.signedCookies?.[REFRESH_COOKIE_NAME];
    await this.authService.logout(rawToken, undefined, this.requestContext(req));
    this.clearRefreshCookie(res);
    return { data: null, message: 'Sessão terminada.' };
  }

  @Post('logout-all')
  async logoutAll(
    @CurrentUser() user: CurrentUserPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logoutAll(user.userId);
    this.clearRefreshCookie(res);
    return { data: null, message: 'Sessão terminada em todos os dispositivos.' };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email).then((result) => ({
      data: null,
      message: result.message,
    }));
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword).then((result) => ({
      data: null,
      message: result.message,
    }));
  }

  @Post('change-password')
  changePassword(@CurrentUser() user: CurrentUserPayload, @Body() dto: ChangePasswordDto) {
    return this.authService
      .changePassword(user.userId, dto.currentPassword, dto.newPassword)
      .then((result) => ({ data: null, message: result.message }));
  }

  @Get('me')
  me(@CurrentUser() user: CurrentUserPayload) {
    return this.authService.me(user.userId).then((data) => ({
      data,
      message: 'Utilizador autenticado.',
    }));
  }

  @Get('devices')
  devices(@CurrentUser() user: CurrentUserPayload) {
    return this.authService.listDevices(user.userId).then((data) => ({
      data,
      message: 'Dispositivos associados à conta.',
    }));
  }

  @Delete('devices/:id')
  removeDevice(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.authService.deleteDevice(id, user.userId).then((result) => ({
      data: null,
      message: result.message,
    }));
  }
}
