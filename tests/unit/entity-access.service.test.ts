// Unit tests for EntityAccessService
import { EntityAccessService } from '../../src/services/entity-access.service';
import { EntityAccessRepository } from '../../src/repositories/entity-access.repository';
import { ModuleRoleRepository } from '../../src/repositories/module-role.repository';
import { UserRepository } from '../../src/repositories/user.repository';
import { NotFoundError, ConflictError, ValidationError } from '../../src/utils/errors';
import { EntityAccessRule } from '../../src/models/entity-access.model';
import { ModuleRole } from '../../src/models/module.model';
import { UserRole } from '../../src/models/role.model';

jest.mock('../../src/config/database', () => ({
  pool: { query: jest.fn(), connect: jest.fn() },
}));

describe('EntityAccessService', () => {
  let service: EntityAccessService;
  let mockEntityAccessRepo: jest.Mocked<EntityAccessRepository>;
  let mockModuleRoleRepo: jest.Mocked<ModuleRoleRepository>;
  let mockUserRepo: jest.Mocked<UserRepository>;

  const now = new Date('2026-01-01T00:00:00Z');

  const sampleModuleRole: ModuleRole = {
    id: 'mr-1',
    moduleId: 'mod-1',
    name: 'OrderEditor',
    description: 'Can edit orders',
    createdAt: now,
    updatedAt: now,
  };

  const sampleRule: EntityAccessRule = {
    id: 'ear-1',
    moduleRoleId: 'mr-1',
    entity: 'Order',
    canCreate: true,
    canRead: true,
    canUpdate: false,
    canDelete: false,
    rowFilter: null,
    fieldAccess: null,
    createdAt: now,
    updatedAt: now,
  };

  const sampleUserRole: UserRole = {
    id: 'role-1',
    name: 'Manager',
    description: null,
    createdAt: now,
    updatedAt: now,
  };

  beforeEach(() => {
    mockEntityAccessRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByModuleRoleId: jest.fn(),
      findByModuleRoleIds: jest.fn(),
      findByModuleRoleAndEntity: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<EntityAccessRepository>;

    mockModuleRoleRepo = {
      findById: jest.fn(),
      findByModuleId: jest.fn(),
      findByNameInModule: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      isModuleRoleMapped: jest.fn(),
      getModuleRolesForUserRole: jest.fn(),
      addModuleRoleToUserRole: jest.fn(),
      removeModuleRoleFromUserRole: jest.fn(),
      isMappingExists: jest.fn(),
    } as jest.Mocked<ModuleRoleRepository>;

    mockUserRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByIdWithRoles: jest.fn(),
      findByName: jest.fn(),
      findPasswordHashById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updatePassword: jest.fn(),
      updateStatus: jest.fn(),
      updateLastLogin: jest.fn(),
      delete: jest.fn(),
      getUserRoles: jest.fn(),
      setUserRoles: jest.fn(),
      isRoleAssignedToAnyUser: jest.fn(),
      updateTeamAssignment: jest.fn(),
    } as jest.Mocked<UserRepository>;

    service = new EntityAccessService(mockEntityAccessRepo, mockModuleRoleRepo, mockUserRepo);
    jest.clearAllMocks();
  });

  // === CRUD ===

  describe('createRule', () => {
    it('should create a rule (AC-051-01)', async () => {
      mockModuleRoleRepo.findById.mockResolvedValue(sampleModuleRole);
      mockEntityAccessRepo.findByModuleRoleAndEntity.mockResolvedValue(null);
      mockEntityAccessRepo.create.mockResolvedValue(sampleRule);

      const result = await service.createRule({
        moduleRoleId: 'mr-1',
        entity: 'Order',
        canCreate: true,
        canRead: true,
      });

      expect(result).toEqual(sampleRule);
      expect(mockEntityAccessRepo.create).toHaveBeenCalled();
    });

    it('should throw ValidationError when entity name is empty', async () => {
      await expect(service.createRule({ moduleRoleId: 'mr-1', entity: '' })).rejects.toThrow(
        ValidationError
      );
    });

    it('should throw ValidationError when moduleRoleId is empty', async () => {
      await expect(service.createRule({ moduleRoleId: '', entity: 'Order' })).rejects.toThrow(
        ValidationError
      );
    });

    it('should throw NotFoundError when module role not found', async () => {
      mockModuleRoleRepo.findById.mockResolvedValue(null);

      await expect(
        service.createRule({ moduleRoleId: 'nonexistent', entity: 'Order' })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ConflictError when rule already exists for module role + entity', async () => {
      mockModuleRoleRepo.findById.mockResolvedValue(sampleModuleRole);
      mockEntityAccessRepo.findByModuleRoleAndEntity.mockResolvedValue(sampleRule);

      await expect(service.createRule({ moduleRoleId: 'mr-1', entity: 'Order' })).rejects.toThrow(
        ConflictError
      );
    });
  });

  describe('getAllRules', () => {
    it('should return all rules (AC-051-06)', async () => {
      mockEntityAccessRepo.findAll.mockResolvedValue([sampleRule]);

      const result = await service.getAllRules();

      expect(result).toHaveLength(1);
      expect(mockEntityAccessRepo.findAll).toHaveBeenCalled();
    });

    it('should filter by moduleRoleId when provided', async () => {
      mockEntityAccessRepo.findByModuleRoleId.mockResolvedValue([sampleRule]);

      const result = await service.getAllRules('mr-1');

      expect(result).toHaveLength(1);
      expect(mockEntityAccessRepo.findByModuleRoleId).toHaveBeenCalledWith('mr-1');
    });
  });

  describe('getRuleById', () => {
    it('should return rule when found', async () => {
      mockEntityAccessRepo.findById.mockResolvedValue(sampleRule);

      const result = await service.getRuleById('ear-1');

      expect(result).toEqual(sampleRule);
    });

    it('should throw NotFoundError when not found', async () => {
      mockEntityAccessRepo.findById.mockResolvedValue(null);

      await expect(service.getRuleById('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateRule', () => {
    it('should update rule (AC-051-02)', async () => {
      mockEntityAccessRepo.findById.mockResolvedValue(sampleRule);
      mockEntityAccessRepo.update.mockResolvedValue({ ...sampleRule, canUpdate: true });

      const result = await service.updateRule('ear-1', { canUpdate: true });

      expect(result.canUpdate).toBe(true);
    });

    it('should update rowFilter (AC-051-07)', async () => {
      const filter = { field: 'status', op: 'eq', value: 'active' };
      mockEntityAccessRepo.findById.mockResolvedValue(sampleRule);
      mockEntityAccessRepo.update.mockResolvedValue({ ...sampleRule, rowFilter: filter });

      const result = await service.updateRule('ear-1', { rowFilter: filter });

      expect(result.rowFilter).toEqual(filter);
    });

    it('should update fieldAccess', async () => {
      const fa = { email: 'read' as const, salary: 'none' as const };
      mockEntityAccessRepo.findById.mockResolvedValue(sampleRule);
      mockEntityAccessRepo.update.mockResolvedValue({ ...sampleRule, fieldAccess: fa });

      const result = await service.updateRule('ear-1', { fieldAccess: fa });

      expect(result.fieldAccess).toEqual(fa);
    });

    it('should throw NotFoundError when rule not found', async () => {
      mockEntityAccessRepo.findById.mockResolvedValue(null);

      await expect(service.updateRule('nonexistent', { canCreate: true })).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('deleteRule', () => {
    it('should delete rule', async () => {
      mockEntityAccessRepo.findById.mockResolvedValue(sampleRule);
      mockEntityAccessRepo.delete.mockResolvedValue(true);

      await service.deleteRule('ear-1');

      expect(mockEntityAccessRepo.delete).toHaveBeenCalledWith('ear-1');
    });

    it('should throw NotFoundError when rule not found', async () => {
      mockEntityAccessRepo.findById.mockResolvedValue(null);

      await expect(service.deleteRule('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  // === Permission Resolution ===

  describe('resolveForUser', () => {
    it('should resolve effective permissions for user (AC-051-05)', async () => {
      mockUserRepo.getUserRoles.mockResolvedValue([sampleUserRole]);
      mockModuleRoleRepo.getModuleRolesForUserRole.mockResolvedValue([sampleModuleRole]);
      mockEntityAccessRepo.findByModuleRoleIds.mockResolvedValue([sampleRule]);

      const result = await service.resolveForUser('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].entity).toBe('Order');
      expect(result[0].canCreate).toBe(true);
      expect(result[0].canRead).toBe(true);
      expect(result[0].canUpdate).toBe(false);
      expect(result[0].canDelete).toBe(false);
    });

    it('should filter by entity when specified', async () => {
      mockUserRepo.getUserRoles.mockResolvedValue([sampleUserRole]);
      mockModuleRoleRepo.getModuleRolesForUserRole.mockResolvedValue([sampleModuleRole]);
      mockEntityAccessRepo.findByModuleRoleIds.mockResolvedValue([
        sampleRule,
        { ...sampleRule, id: 'ear-2', entity: 'Product', canRead: true },
      ]);

      const result = await service.resolveForUser('user-1', 'Order');

      expect(result).toHaveLength(1);
      expect(result[0].entity).toBe('Order');
    });

    it('should return empty when user has no roles', async () => {
      mockUserRepo.getUserRoles.mockResolvedValue([]);

      const result = await service.resolveForUser('user-1');

      expect(result).toEqual([]);
    });

    it('should return empty when no module roles mapped', async () => {
      mockUserRepo.getUserRoles.mockResolvedValue([sampleUserRole]);
      mockModuleRoleRepo.getModuleRolesForUserRole.mockResolvedValue([]);

      const result = await service.resolveForUser('user-1');

      expect(result).toEqual([]);
    });

    it('should return empty when no rules exist', async () => {
      mockUserRepo.getUserRoles.mockResolvedValue([sampleUserRole]);
      mockModuleRoleRepo.getModuleRolesForUserRole.mockResolvedValue([sampleModuleRole]);
      mockEntityAccessRepo.findByModuleRoleIds.mockResolvedValue([]);

      const result = await service.resolveForUser('user-1');

      expect(result).toEqual([]);
    });

    it('should deduplicate module role IDs across user roles', async () => {
      const role2: UserRole = { ...sampleUserRole, id: 'role-2', name: 'Admin' };
      mockUserRepo.getUserRoles.mockResolvedValue([sampleUserRole, role2]);
      // Both roles map to same module role
      mockModuleRoleRepo.getModuleRolesForUserRole.mockResolvedValue([sampleModuleRole]);
      mockEntityAccessRepo.findByModuleRoleIds.mockResolvedValue([sampleRule]);

      const result = await service.resolveForUser('user-1');

      // Should pass deduplicated array
      expect(mockEntityAccessRepo.findByModuleRoleIds).toHaveBeenCalledWith(['mr-1']);
      expect(result).toHaveLength(1);
    });
  });

  describe('combineRules', () => {
    it('should combine CRUD flags with OR (additive)', () => {
      const rules: EntityAccessRule[] = [
        { ...sampleRule, canCreate: true, canRead: false, canUpdate: false, canDelete: false },
        {
          ...sampleRule,
          id: 'ear-2',
          canCreate: false,
          canRead: true,
          canUpdate: true,
          canDelete: false,
        },
      ];

      const result = service.combineRules(rules);

      expect(result).toHaveLength(1);
      expect(result[0].canCreate).toBe(true);
      expect(result[0].canRead).toBe(true);
      expect(result[0].canUpdate).toBe(true);
      expect(result[0].canDelete).toBe(false);
    });

    it('should collect row filters from all rules', () => {
      const filter1 = { field: 'owner_id', op: 'eq', value: '$currentUser' };
      const filter2 = { field: 'status', op: 'eq', value: 'active' };
      const rules: EntityAccessRule[] = [
        { ...sampleRule, rowFilter: filter1 },
        { ...sampleRule, id: 'ear-2', rowFilter: filter2 },
      ];

      const result = service.combineRules(rules);

      expect(result[0].rowFilters).toHaveLength(2);
      expect(result[0].rowFilters).toContainEqual(filter1);
      expect(result[0].rowFilters).toContainEqual(filter2);
    });

    it('should skip null row filters', () => {
      const rules: EntityAccessRule[] = [
        { ...sampleRule, rowFilter: null },
        { ...sampleRule, id: 'ear-2', rowFilter: { field: 'x' } },
      ];

      const result = service.combineRules(rules);

      expect(result[0].rowFilters).toHaveLength(1);
    });

    it('should group by entity', () => {
      const rules: EntityAccessRule[] = [
        { ...sampleRule, entity: 'Order', canCreate: true },
        { ...sampleRule, id: 'ear-2', entity: 'Product', canRead: true, canCreate: false },
      ];

      const result = service.combineRules(rules);

      expect(result).toHaveLength(2);
      const orderResult = result.find((r) => r.entity === 'Order');
      const productResult = result.find((r) => r.entity === 'Product');
      expect(orderResult?.canCreate).toBe(true);
      expect(productResult?.canRead).toBe(true);
    });

    it('should return results sorted by entity name', () => {
      const rules: EntityAccessRule[] = [
        { ...sampleRule, entity: 'Zebra' },
        { ...sampleRule, id: 'ear-2', entity: 'Alpha' },
      ];

      const result = service.combineRules(rules);

      expect(result[0].entity).toBe('Alpha');
      expect(result[1].entity).toBe('Zebra');
    });

    it('should return empty array for no rules', () => {
      const result = service.combineRules([]);

      expect(result).toEqual([]);
    });
  });

  describe('mergeFieldAccess', () => {
    it('should use most permissive level per field (readwrite > read > none)', () => {
      const target: Record<string, 'none' | 'read' | 'readwrite'> = {};
      service.mergeFieldAccess(target, { email: 'read', salary: 'none' });
      service.mergeFieldAccess(target, { email: 'readwrite', salary: 'read', name: 'readwrite' });

      expect(target.email).toBe('readwrite');
      expect(target.salary).toBe('read');
      expect(target.name).toBe('readwrite');
    });

    it('should not downgrade access level', () => {
      const target: Record<string, 'none' | 'read' | 'readwrite'> = { email: 'readwrite' };
      service.mergeFieldAccess(target, { email: 'read' });

      expect(target.email).toBe('readwrite');
    });

    it('should handle empty source', () => {
      const target: Record<string, 'none' | 'read' | 'readwrite'> = { email: 'read' };
      service.mergeFieldAccess(target, {});

      expect(target.email).toBe('read');
    });
  });
});
