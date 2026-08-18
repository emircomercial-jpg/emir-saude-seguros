export interface Role {
  id: string;
  name: string;
  code: string;
}

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  status?: string;
  twoFactorEnabled?: boolean;
  lastLoginAt?: string | null;
  isPlatformAdmin?: boolean;
  roles: Role[];
}

export interface LoginResponseData {
  accessToken: string;
  user: AuthUser;
}
