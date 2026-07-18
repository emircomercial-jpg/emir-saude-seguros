import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EMAIL_SERVICE, EmailService } from '../email/email.service.interface';
import { parseDeviceInfo } from '../common/utils/device-info.util';
import { parseDurationToMs } from '../common/utils/duration.util';
import { LoginDto } from './dto/login.dto';

interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
}

// Autenticação segura (secção 7 do briefing).
//
// Regras aplicadas:
// - a palavra-passe nunca é guardada em texto simples (bcrypt, custo 12);
// - o refresh token é gerado aleatoriamente e guardado apenas como hash
//   (SHA-256) — nunca em texto simples na base de dados;
// - o access token tem duração curta; o refresh token, duração maior;
// - bloqueio temporário da conta após MAX_LOGIN_ATTEMPTS falhas consecutivas;
// - cada refresh token está associado a um dispositivo, permitindo terminar
//   sessão num dispositivo específico ou em todos de uma vez.
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly auditService: AuditService,
    @Inject(EMAIL_SERVICE) private readonly emailService: EmailService,
  ) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private generateRawToken(): string {
    return crypto.randomBytes(48).toString('hex');
  }

  private async findOrCreateDevice(userId: string, ctx: RequestContext) {
    const { deviceType, browser, operatingSystem } = parseDeviceInfo(ctx.userAgent);

    const existing = await this.prisma.device.findFirst({
      where: { userId, browser, operatingSystem, deviceType },
    });

    if (existing) {
      return this.prisma.device.update({
        where: { id: existing.id },
        data: { lastAccessAt: new Date(), lastIpAddress: ctx.ipAddress },
      });
    }

    return this.prisma.device.create({
      data: {
        userId,
        deviceName: `${browser} em ${operatingSystem}`,
        deviceType,
        browser,
        operatingSystem,
        lastIpAddress: ctx.ipAddress,
        lastAccessAt: new Date(),
      },
    });
  }

  private signAccessToken(user: { id: string; email: string; organizationId: string }): string {
    return this.jwtService.sign(
      { sub: user.id, email: user.email, organizationId: user.organizationId },
      {
        secret: this.config.get<string>('jwt.accessSecret'),
        expiresIn: this.config.get<string>('jwt.accessExpiresIn'),
      },
    );
  }

  private async issueRefreshToken(userId: string, deviceId?: string) {
    const rawToken = this.generateRawToken();
    const expiresInMs = parseDurationToMs(this.config.get<string>('jwt.refreshExpiresIn')!);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        deviceId,
        tokenHash: this.hashToken(rawToken),
        expiresAt: new Date(Date.now() + expiresInMs),
      },
    });

    return { rawToken, expiresInMs };
  }

  // ---------- Login ----------

  async login(dto: LoginDto, ctx: RequestContext) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    const genericError = () => new UnauthorizedException('Credenciais inválidas.');

    if (!user || user.deletedAt) {
      await this.auditService.log({
        action: 'login_failed',
        module: 'auth',
        description: `Tentativa de login com e-mail inexistente: ${dto.email}`,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });
      throw genericError();
    }

    const maxAttempts = this.config.get<number>('security.maxLoginAttempts')!;
    const lockMinutes = this.config.get<number>('security.loginLockMinutes')!;

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await this.auditService.log({
        organizationId: user.organizationId,
        userId: user.id,
        action: 'login_failed',
        module: 'auth',
        description: 'Tentativa de login com conta temporariamente bloqueada.',
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });
      throw new UnauthorizedException(
        `Conta temporariamente bloqueada até ${user.lockedUntil.toLocaleString('pt-PT')} devido a várias tentativas falhadas.`,
      );
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException(`Conta com estado "${user.status}" — acesso negado.`);
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!passwordValid) {
      const failedAttempts = user.failedLoginAttempts + 1;
      const shouldLock = failedAttempts >= maxAttempts;

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: shouldLock ? 0 : failedAttempts,
          lockedUntil: shouldLock ? new Date(Date.now() + lockMinutes * 60_000) : null,
        },
      });

      await this.auditService.log({
        organizationId: user.organizationId,
        userId: user.id,
        action: 'login_failed',
        module: 'auth',
        description: shouldLock
          ? `Conta bloqueada por ${lockMinutes} minutos após ${maxAttempts} tentativas falhadas.`
          : `Palavra-passe incorrecta (tentativa ${failedAttempts}/${maxAttempts}).`,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });

      throw genericError();
    }

    // Login bem-sucedido — repõe o contador de tentativas e regista o acesso.
    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    const device = await this.findOrCreateDevice(user.id, ctx);
    const accessToken = this.signAccessToken(user);
    const { rawToken: refreshToken, expiresInMs } = await this.issueRefreshToken(user.id, device.id);

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'login',
      module: 'auth',
      description: 'Início de sessão bem-sucedido.',
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    const roles = await this.prisma.userRole.findMany({
      where: { userId: user.id },
      include: { role: true },
    });

    return {
      accessToken,
      refreshToken,
      refreshTokenExpiresInMs: expiresInMs,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        roles: roles.map((r) => ({ id: r.role.id, name: r.role.name, code: r.role.code })),
      },
    };
  }

  // ---------- Refresh ----------

  async refresh(rawToken: string | undefined, ctx: RequestContext) {
    if (!rawToken) {
      throw new UnauthorizedException('Sessão não encontrada.');
    }

    const tokenHash = this.hashToken(rawToken);
    const existing = await this.prisma.refreshToken.findFirst({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
      include: { user: true },
    });

    if (!existing || !existing.user || existing.user.deletedAt || existing.user.status !== 'active') {
      throw new UnauthorizedException('Sessão inválida ou expirada. Inicie sessão novamente.');
    }

    // Rotação do refresh token: o token usado é revogado e um novo é emitido,
    // reduzindo o impacto de um token roubado.
    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });

    const accessToken = this.signAccessToken(existing.user);
    const { rawToken: newRefreshToken, expiresInMs } = await this.issueRefreshToken(
      existing.user.id,
      existing.deviceId || undefined,
    );

    return { accessToken, refreshToken: newRefreshToken, refreshTokenExpiresInMs: expiresInMs };
  }

  // ---------- Logout ----------

  async logout(rawToken: string | undefined, userId?: string, ctx?: RequestContext) {
    if (rawToken) {
      const tokenHash = this.hashToken(rawToken);
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    if (userId) {
      await this.auditService.log({
        userId,
        action: 'logout',
        module: 'auth',
        description: 'Sessão terminada.',
        ipAddress: ctx?.ipAddress,
        userAgent: ctx?.userAgent,
      });
    }
  }

  async logoutAll(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.auditService.log({
      userId,
      action: 'logout_all',
      module: 'auth',
      description: 'Sessão terminada em todos os dispositivos.',
    });
  }

  // ---------- Recuperação e alteração de palavra-passe ----------

  // Resposta sempre igual, exista ou não o e-mail, para não revelar quais
  // e-mails estão registados no sistema.
  private static readonly FORGOT_PASSWORD_MESSAGE =
    'Se o e-mail indicado estiver registado, receberá instruções para recuperar a palavra-passe.';

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (user && !user.deletedAt && user.status === 'active') {
      const rawToken = this.generateRawToken();
      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: this.hashToken(rawToken),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hora
        },
      });

      await this.emailService.sendPasswordReset(user.email, user.fullName, rawToken);
    }

    return { message: AuthService.FORGOT_PASSWORD_MESSAGE };
  }

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = this.hashToken(token);
    const resetToken = await this.prisma.passwordResetToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
      include: { user: true },
    });

    if (!resetToken) {
      throw new BadRequestException('Token de recuperação inválido ou expirado.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
      this.prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
      // Por segurança, termina todas as sessões activas ao repor a palavra-passe.
      this.prisma.refreshToken.updateMany({
        where: { userId: resetToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await this.auditService.log({
      userId: resetToken.userId,
      action: 'password_reset',
      module: 'auth',
      description: 'Palavra-passe recuperada através de token de recuperação.',
    });

    return { message: 'Palavra-passe alterada com sucesso. Inicie sessão com a nova palavra-passe.' };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('Utilizador não encontrado.');
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      throw new BadRequestException('A palavra-passe actual está incorrecta.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });

    await this.auditService.log({
      organizationId: user.organizationId,
      userId,
      action: 'password_change',
      module: 'auth',
      description: 'Palavra-passe alterada pelo próprio utilizador.',
    });

    return { message: 'Palavra-passe alterada com sucesso.' };
  }

  // ---------- Perfil e dispositivos ----------

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } } },
    });
    if (!user) {
      throw new UnauthorizedException('Utilizador não encontrado.');
    }

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      status: user.status,
      twoFactorEnabled: user.twoFactorEnabled,
      lastLoginAt: user.lastLoginAt,
      roles: user.roles.map((r) => ({ id: r.role.id, name: r.role.name, code: r.role.code })),
    };
  }

  async listDevices(userId: string) {
    return this.prisma.device.findMany({
      where: { userId },
      orderBy: { lastAccessAt: 'desc' },
    });
  }

  async deleteDevice(deviceId: string, userId: string) {
    const device = await this.prisma.device.findFirst({ where: { id: deviceId, userId } });
    if (!device) {
      throw new BadRequestException('Dispositivo não encontrado.');
    }

    await this.prisma.$transaction([
      this.prisma.refreshToken.deleteMany({ where: { deviceId } }),
      this.prisma.device.delete({ where: { id: deviceId } }),
    ]);

    await this.auditService.log({
      userId,
      action: 'device_revoked',
      module: 'auth',
      description: `Dispositivo "${device.deviceName}" revogado e sessões terminadas.`,
    });

    return { message: 'Dispositivo removido e sessões terminadas.' };
  }
}
