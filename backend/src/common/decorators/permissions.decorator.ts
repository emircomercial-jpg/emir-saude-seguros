import { SetMetadata } from '@nestjs/common';

// Uso: @RequirePermissions('users.create', 'users.update')
export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
