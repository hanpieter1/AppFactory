// Service layer for RouteAccessRule business logic
import { RouteAccessRepository } from '../repositories/route-access.repository';
import { ModuleRoleRepository } from '../repositories/module-role.repository';
import { UserRepository } from '../repositories/user.repository';
import {
  RouteAccessRule,
  ResolvedRouteAccess,
  CreateRouteAccessRuleDto,
  UpdateRouteAccessRuleDto,
} from '../models/route-access.model';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors';

const VALID_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export class RouteAccessService {
  constructor(
    private readonly routeAccessRepository: RouteAccessRepository,
    private readonly moduleRoleRepository: ModuleRoleRepository,
    private readonly userRepository: UserRepository
  ) {}

  // === CRUD ===

  async createRule(dto: CreateRouteAccessRuleDto): Promise<RouteAccessRule> {
    if (!dto.route || dto.route.trim().length === 0) {
      throw new ValidationError('Route is required');
    }
    if (!dto.moduleRoleId || dto.moduleRoleId.trim().length === 0) {
      throw new ValidationError('Module role ID is required');
    }
    if (!dto.methods || dto.methods.length === 0) {
      throw new ValidationError('At least one HTTP method is required');
    }

    const invalidMethods = dto.methods.filter((m) => !VALID_METHODS.includes(m.toUpperCase()));
    if (invalidMethods.length > 0) {
      throw new ValidationError(`Invalid HTTP methods: ${invalidMethods.join(', ')}`);
    }

    const moduleRole = await this.moduleRoleRepository.findById(dto.moduleRoleId);
    if (!moduleRole) {
      throw new NotFoundError(`Module role with id '${dto.moduleRoleId}' not found`);
    }

    const existing = await this.routeAccessRepository.findByModuleRoleAndRoute(
      dto.moduleRoleId,
      dto.route
    );
    if (existing) {
      throw new ConflictError(
        `Route access rule for '${dto.route}' already exists for module role '${moduleRole.name}'`
      );
    }

    return this.routeAccessRepository.create({
      ...dto,
      methods: dto.methods.map((m) => m.toUpperCase()),
    });
  }

  async getAllRules(moduleRoleId?: string): Promise<RouteAccessRule[]> {
    if (moduleRoleId) {
      return this.routeAccessRepository.findByModuleRoleId(moduleRoleId);
    }
    return this.routeAccessRepository.findAll();
  }

  async getRuleById(id: string): Promise<RouteAccessRule> {
    const rule = await this.routeAccessRepository.findById(id);
    if (!rule) {
      throw new NotFoundError(`Route access rule with id '${id}' not found`);
    }
    return rule;
  }

  async updateRule(id: string, dto: UpdateRouteAccessRuleDto): Promise<RouteAccessRule> {
    const existing = await this.routeAccessRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Route access rule with id '${id}' not found`);
    }

    if (dto.methods !== undefined) {
      if (dto.methods.length === 0) {
        throw new ValidationError('At least one HTTP method is required');
      }
      const invalidMethods = dto.methods.filter((m) => !VALID_METHODS.includes(m.toUpperCase()));
      if (invalidMethods.length > 0) {
        throw new ValidationError(`Invalid HTTP methods: ${invalidMethods.join(', ')}`);
      }
      dto.methods = dto.methods.map((m) => m.toUpperCase());
    }

    const updated = await this.routeAccessRepository.update(id, dto);
    return updated!;
  }

  async deleteRule(id: string): Promise<void> {
    const existing = await this.routeAccessRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Route access rule with id '${id}' not found`);
    }

    await this.routeAccessRepository.delete(id);
  }

  // === Resolution ===

  async resolveForUser(userId: string): Promise<ResolvedRouteAccess[]> {
    const moduleRoleIds = await this.getUserModuleRoleIds(userId);
    if (moduleRoleIds.length === 0) return [];

    const rules = await this.routeAccessRepository.findByModuleRoleIds(moduleRoleIds);
    if (rules.length === 0) return [];

    return this.combineRules(rules);
  }

  async canAccessRoute(userId: string, path: string, method: string): Promise<boolean> {
    const moduleRoleIds = await this.getUserModuleRoleIds(userId);
    if (moduleRoleIds.length === 0) return false;

    const rules = await this.routeAccessRepository.findByModuleRoleIds(moduleRoleIds);
    return this.matchRoute(path, method.toUpperCase(), rules);
  }

  // === Helpers ===

  private async getUserModuleRoleIds(userId: string): Promise<string[]> {
    const userRoles = await this.userRepository.getUserRoles(userId);
    if (userRoles.length === 0) return [];

    const allModuleRoleIds: string[] = [];
    for (const role of userRoles) {
      const moduleRoles = await this.moduleRoleRepository.getModuleRolesForUserRole(role.id);
      allModuleRoleIds.push(...moduleRoles.map((mr) => mr.id));
    }

    return [...new Set(allModuleRoleIds)];
  }

  combineRules(rules: RouteAccessRule[]): ResolvedRouteAccess[] {
    const grouped = new Map<string, { methods: Set<string>; isWildcard: boolean }>();

    for (const rule of rules) {
      const existing = grouped.get(rule.route);
      if (existing) {
        rule.methods.forEach((m) => existing.methods.add(m));
        existing.isWildcard = existing.isWildcard || rule.isWildcard;
      } else {
        grouped.set(rule.route, {
          methods: new Set(rule.methods),
          isWildcard: rule.isWildcard,
        });
      }
    }

    const results: ResolvedRouteAccess[] = [];
    for (const [route, data] of grouped) {
      results.push({
        route,
        methods: [...data.methods].sort(),
        isWildcard: data.isWildcard,
      });
    }

    return results.sort((a, b) => a.route.localeCompare(b.route));
  }

  matchRoute(path: string, method: string, rules: RouteAccessRule[]): boolean {
    for (const rule of rules) {
      let routeMatches = false;

      if (rule.isWildcard) {
        const baseRoute = rule.route.replace(/\/\*$/, '');
        routeMatches = path === baseRoute || path.startsWith(baseRoute + '/');
      } else {
        routeMatches = path === rule.route;
      }

      if (routeMatches && rule.methods.includes(method)) {
        return true;
      }
    }
    return false;
  }
}
