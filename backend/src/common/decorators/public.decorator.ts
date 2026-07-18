import { SetMetadata } from '@nestjs/common';

// Marca uma rota como pública — não exige token de acesso.
// Uso: @Public() nas rotas de login, refresh, forgot/reset-password.
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
