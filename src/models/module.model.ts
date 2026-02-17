// Module and ModuleRole domain models and DTOs

export interface Module {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ModuleRole {
  id: string;
  moduleId: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ModuleWithRoles extends Module {
  roles: ModuleRole[];
}

export interface CreateModuleDto {
  name: string;
  description?: string;
}

export interface UpdateModuleDto {
  name?: string;
  description?: string;
}

export interface CreateModuleRoleDto {
  name: string;
  description?: string;
}

export interface UpdateModuleRoleDto {
  name?: string;
  description?: string;
}
