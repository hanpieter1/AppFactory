// Team domain model and DTOs
// Epic 1: Organization & People (#7, #8)

export interface Team {
  id: string;
  name: string;
  departmentId: string;
  description: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamWithDetails extends Team {
  departmentName: string;
  memberCount: number;
}

export interface CreateTeamDto {
  name: string;
  departmentId: string;
  description?: string;
  active?: boolean;
}

export interface UpdateTeamDto {
  name?: string;
  departmentId?: string;
  description?: string;
  active?: boolean;
}

export interface TeamFilters {
  departmentId?: string;
  active?: boolean;
  search?: string;
}
