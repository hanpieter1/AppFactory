// Authentication domain models and DTOs
import { UserRole } from './role.model';

export interface Session {
  id: string;
  userId: string;
  csrfToken: string;
  lastActive: Date;
  createdAt: Date;
}

export interface TokenInformation {
  id: string;
  userId: string;
  sessionId: string;
  tokenHash: string;
  expiryDate: Date;
  userAgent: string | null;
  createdAt: Date;
}

export interface JwtPayload {
  userId: string;
  sessionId: string;
  roles: string[];
  moduleRoles: string[];
}

export interface LoginDto {
  name: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
  user: {
    id: string;
    name: string;
    fullName: string | null;
    roles: UserRole[];
  };
}

export interface RefreshDto {
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface LogoutDto {
  refreshToken: string;
}
