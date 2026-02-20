// Department domain model and DTOs
// Epic 1: Organization & People (#6)

export interface Department {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DepartmentWithTeamCount extends Department {
  teamCount: number;
  memberCount: number;
}

export interface CreateDepartmentDto {
  name: string;
  description?: string;
  active?: boolean;
}

export interface UpdateDepartmentDto {
  name?: string;
  description?: string;
  active?: boolean;
}

export interface DepartmentFilters {
  active?: boolean;
  search?: string;
}
