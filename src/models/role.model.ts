// User Role domain model and DTOs

export interface UserRole {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRoleWithGrantable extends UserRole {
  grantableRoles: UserRole[];
}

export interface CreateRoleDto {
  name: string;
  description?: string;
}

export interface UpdateRoleDto {
  name?: string;
  description?: string;
}

export interface SetGrantableRolesDto {
  grantableRoleIds: string[];
}
