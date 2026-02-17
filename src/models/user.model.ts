// User/Account domain model and DTOs
import { UserRole } from './role.model';

export enum UserType {
  Internal = 'Internal',
  External = 'External',
}

// User entity — password deliberately omitted from responses
export interface User {
  id: string;
  name: string;
  fullName: string | null;
  email: string | null;
  active: boolean;
  blocked: boolean;
  blockedSince: Date | null;
  failedLogins: number;
  lastLogin: Date | null;
  webServiceUser: boolean;
  isAnonymous: boolean;
  isLocalUser: boolean;
  userType: UserType;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithRoles extends User {
  roles: UserRole[];
}

export interface CreateUserDto {
  name: string;
  password: string;
  fullName?: string;
  email?: string;
  roleIds?: string[];
}

export interface CreateWebServiceUserDto {
  name: string;
  password: string;
  fullName?: string;
  roleIds?: string[];
}

export interface UpdateUserDto {
  fullName?: string;
  email?: string;
}

export interface UpdateUserRolesDto {
  roleIds: string[];
}

export interface UpdateUserStatusDto {
  active?: boolean;
  blocked?: boolean;
}

export interface AdminChangePasswordDto {
  newPassword: string;
  confirmPassword: string;
}

export interface ChangeMyPasswordDto {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UpdateMyProfileDto {
  fullName?: string;
  email?: string;
}

// --- Pagination & query types for GET /api/users (US-056) ---

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
}

export type UserSortField = 'fullName' | 'name' | 'lastLogin' | 'active';
export type SortOrder = 'asc' | 'desc';

export interface UserListQuery {
  active?: boolean;
  webServiceUser?: boolean;
  isLocalUser?: boolean;
  role?: string;
  search?: string;
  sortBy?: UserSortField;
  order?: SortOrder;
  page?: number;
  limit?: number;
}
