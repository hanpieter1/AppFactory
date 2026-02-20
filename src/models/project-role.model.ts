// Project role domain model and DTOs
// Epic 1: Organization & People (#9)

export interface ProjectRole {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProjectRoleDto {
  name: string;
  description?: string;
}

export interface UpdateProjectRoleDto {
  name?: string;
  description?: string;
}
