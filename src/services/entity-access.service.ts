// Service layer for EntityAccessRule business logic
import { EntityAccessRepository } from '../repositories/entity-access.repository';
import { ModuleRoleRepository } from '../repositories/module-role.repository';
import { UserRepository } from '../repositories/user.repository';
import {
  EntityAccessRule,
  ResolvedEntityAccess,
  FieldAccessLevel,
  CreateEntityAccessRuleDto,
  UpdateEntityAccessRuleDto,
} from '../models/entity-access.model';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors';

const FIELD_ACCESS_PRIORITY: Record<FieldAccessLevel, number> = {
  none: 0,
  read: 1,
  readwrite: 2,
};

export class EntityAccessService {
  constructor(
    private readonly entityAccessRepository: EntityAccessRepository,
    private readonly moduleRoleRepository: ModuleRoleRepository,
    private readonly userRepository: UserRepository
  ) {}

  // === CRUD ===

  async createRule(dto: CreateEntityAccessRuleDto): Promise<EntityAccessRule> {
    if (!dto.entity || dto.entity.trim().length === 0) {
      throw new ValidationError('Entity name is required');
    }
    if (!dto.moduleRoleId || dto.moduleRoleId.trim().length === 0) {
      throw new ValidationError('Module role ID is required');
    }

    const moduleRole = await this.moduleRoleRepository.findById(dto.moduleRoleId);
    if (!moduleRole) {
      throw new NotFoundError(`Module role with id '${dto.moduleRoleId}' not found`);
    }

    const existing = await this.entityAccessRepository.findByModuleRoleAndEntity(
      dto.moduleRoleId,
      dto.entity
    );
    if (existing) {
      throw new ConflictError(
        `Access rule for entity '${dto.entity}' already exists for module role '${moduleRole.name}'`
      );
    }

    return this.entityAccessRepository.create(dto);
  }

  async getAllRules(moduleRoleId?: string): Promise<EntityAccessRule[]> {
    if (moduleRoleId) {
      return this.entityAccessRepository.findByModuleRoleId(moduleRoleId);
    }
    return this.entityAccessRepository.findAll();
  }

  async getRuleById(id: string): Promise<EntityAccessRule> {
    const rule = await this.entityAccessRepository.findById(id);
    if (!rule) {
      throw new NotFoundError(`Entity access rule with id '${id}' not found`);
    }
    return rule;
  }

  async updateRule(id: string, dto: UpdateEntityAccessRuleDto): Promise<EntityAccessRule> {
    const existing = await this.entityAccessRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Entity access rule with id '${id}' not found`);
    }

    const updated = await this.entityAccessRepository.update(id, dto);
    return updated!;
  }

  async deleteRule(id: string): Promise<void> {
    const existing = await this.entityAccessRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Entity access rule with id '${id}' not found`);
    }

    await this.entityAccessRepository.delete(id);
  }

  // === Permission Resolution (AC-051-05) ===

  async resolveForUser(userId: string, entity?: string): Promise<ResolvedEntityAccess[]> {
    // 1. Get user's roles
    const userRoles = await this.userRepository.getUserRoles(userId);
    if (userRoles.length === 0) return [];

    // 2. Get all module roles mapped to those user roles
    const roleIds = userRoles.map((r) => r.id);
    const allModuleRoles: string[] = [];
    for (const roleId of roleIds) {
      const moduleRoles = await this.moduleRoleRepository.getModuleRolesForUserRole(roleId);
      allModuleRoles.push(...moduleRoles.map((mr) => mr.id));
    }

    if (allModuleRoles.length === 0) return [];

    // 3. Get all entity access rules for those module role IDs
    const uniqueModuleRoleIds = [...new Set(allModuleRoles)];
    const rules = await this.entityAccessRepository.findByModuleRoleIds(uniqueModuleRoleIds);

    if (rules.length === 0) return [];

    // 4. If entity specified, filter
    const filtered = entity ? rules.filter((r) => r.entity === entity) : rules;

    // 5. Combine additively, grouped by entity
    return this.combineRules(filtered);
  }

  combineRules(rules: EntityAccessRule[]): ResolvedEntityAccess[] {
    const grouped = new Map<string, EntityAccessRule[]>();
    for (const rule of rules) {
      const existing = grouped.get(rule.entity) || [];
      existing.push(rule);
      grouped.set(rule.entity, existing);
    }

    const results: ResolvedEntityAccess[] = [];
    for (const [entity, entityRules] of grouped) {
      let canCreate = false;
      let canRead = false;
      let canUpdate = false;
      let canDelete = false;
      const rowFilters: Record<string, unknown>[] = [];
      const fieldAccess: Record<string, FieldAccessLevel> = {};

      for (const rule of entityRules) {
        canCreate = canCreate || rule.canCreate;
        canRead = canRead || rule.canRead;
        canUpdate = canUpdate || rule.canUpdate;
        canDelete = canDelete || rule.canDelete;

        if (rule.rowFilter) {
          rowFilters.push(rule.rowFilter);
        }

        if (rule.fieldAccess) {
          this.mergeFieldAccess(fieldAccess, rule.fieldAccess);
        }
      }

      results.push({
        entity,
        canCreate,
        canRead,
        canUpdate,
        canDelete,
        rowFilters,
        fieldAccess,
      });
    }

    return results.sort((a, b) => a.entity.localeCompare(b.entity));
  }

  mergeFieldAccess(
    target: Record<string, FieldAccessLevel>,
    source: Record<string, FieldAccessLevel>
  ): void {
    for (const [field, level] of Object.entries(source)) {
      const current = target[field] || 'none';
      if (FIELD_ACCESS_PRIORITY[level] > FIELD_ACCESS_PRIORITY[current]) {
        target[field] = level;
      }
    }
  }
}
