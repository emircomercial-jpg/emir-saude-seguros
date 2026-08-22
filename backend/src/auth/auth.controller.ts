import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import * as crypto from 'crypto';
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
const CSRF_COOKIE_NAME = 'csrfToken';
const CSRF_HEADER_NAME = 'x-csrf-token';

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
    this.setCsrfCookie(res, token, maxAgeMs, isProduction);
  }

  // Protecção CSRF (padrão "duplo envio") para o endpoint /refresh — como
  // o cookie de sessão usa sameSite:'none' em produção (necessário porque
  // frontend e backend ficam em domínios diferentes), um site malicioso
  // conseguiria disparar um pedido para /refresh com o cookie anexado
  // automaticamente. Este segundo cookie, propositadamente LEGÍVEL por
  // JavaScript (ao contrário do cookie de sessão), tem de ser lido pelo
  // frontend e reenviado como cabeçalho em cada pedido de refresh — um
  // site malicioso nunca consegue ler cookies de outro domínio, por isso
  // nunca consegue construir esse cabeçalho correctamente.
  //
  // O valor não precisa de ser guardado em lado nenhum: é sempre uma
  // assinatura HMAC do próprio refresh token, com o mesmo segredo dos
  // cookies — por isso é sempre possível recalculá-lo e comparar, sem
  // estado adicional.
  private computeCsrfToken(refreshToken: string): string {
    const secret = this.config.get<string>('cookie.secret')!;
    return crypto.createHmac('sha256', secret).update(refreshToken).digest('hex');
  }

  private setCsrfCookie(res: Response, refreshToken: string, maxAgeMs: number, isProduction: boolean) {
    res.cookie(CSRF_COOKIE_NAME, this.computeCsrfToken(refreshToken), {
      httpOnly: false,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
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
    res.clearCookie(CSRF_COOKIE_NAME, {
      path: '/api/auth',
      httpOnly: false,
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

    // Verificação CSRF — só prossegue se o cabeçalho enviado pelo frontend
    // corresponder ao valor esperado para ESTE refresh token específico.
    // Um site malicioso consegue fazer o browser enviar o cookie
    // automaticamente, mas nunca consegue ler o seu valor para construir
    // este cabeçalho correctamente.
    if (rawToken) {
      const providedCsrfToken = req.headers[CSRF_HEADER_NAME];
      const expectedCsrfToken = this.computeCsrfToken(rawToken);
      if (providedCsrfToken !== expectedCsrfToken) {
        throw new ForbiddenException('Verificação de segurança falhou. Por favor, actualiza a página e tenta novamente.');
      }
    }

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
