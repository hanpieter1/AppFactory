// Entity Access Rule domain models and DTOs

export type FieldAccessLevel = 'none' | 'read' | 'readwrite';

export interface EntityAccessRule {
  id: string;
  moduleRoleId: string;
  entity: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  rowFilter: Record<string, unknown> | null;
  fieldAccess: Record<string, FieldAccessLevel> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResolvedEntityAccess {
  entity: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  rowFilters: Record<string, unknown>[];
  fieldAccess: Record<string, FieldAccessLevel>;
}

export interface CreateEntityAccessRuleDto {
  moduleRoleId: string;
  entity: string;
  canCreate?: boolean;
  canRead?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
  rowFilter?: Record<string, unknown>;
  fieldAccess?: Record<string, FieldAccessLevel>;
}

export interface UpdateEntityAccessRuleDto {
  canCreate?: boolean;
  canRead?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
  rowFilter?: Record<string, unknown> | null;
  fieldAccess?: Record<string, FieldAccessLevel> | null;
}
