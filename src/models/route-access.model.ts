// Route Access Rule domain models and DTOs

export interface RouteAccessRule {
  id: string;
  moduleRoleId: string;
  route: string;
  methods: string[];
  isWildcard: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResolvedRouteAccess {
  route: string;
  methods: string[];
  isWildcard: boolean;
}

export interface CreateRouteAccessRuleDto {
  moduleRoleId: string;
  route: string;
  methods: string[];
  isWildcard?: boolean;
}

export interface UpdateRouteAccessRuleDto {
  methods?: string[];
  isWildcard?: boolean;
}
