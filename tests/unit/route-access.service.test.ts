// Unit tests for RouteAccessService
import { RouteAccessService } from '../../src/services/route-access.service';
import { RouteAccessRepository } from '../../src/repositories/route-access.repository';
import { ModuleRoleRepository } from '../../src/repositories/module-role.repository';
import { UserRepository } from '../../src/repositories/user.repository';
import { NotFoundError, ConflictError, ValidationError } from '../../src/utils/errors';
import { RouteAccessRule } from '../../src/models/route-access.model';
import { ModuleRole } from '../../src/models/module.model';
import { UserRole } from '../../src/models/role.model';

jest.mock('../../src/config/database', () => ({
  pool: { query: jest.fn(), connect: jest.fn() },
}));

describe('RouteAccessService', () => {
  let service: RouteAccessService;
  let mockRouteAccessRepo: jest.Mocked<RouteAccessRepository>;
  let mockModuleRoleRepo: jest.Mocked<ModuleRoleRepository>;
  let mockUserRepo: jest.Mocked<UserRepository>;

  const now = new Date('2026-01-01T00:00:00Z');

  const sampleModuleRole: ModuleRole = {
    id: 'mr-1',
    moduleId: 'mod-1',
    name: 'OrderEditor',
    description: null,
    createdAt: now,
    updatedAt: now,
  };

  const sampleRule: RouteAccessRule = {
    id: 'rar-1',
    moduleRoleId: 'mr-1',
    route: '/api/orders',
    methods: ['GET', 'POST'],
    isWildcard: false,
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
    mockRouteAccessRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByModuleRoleId: jest.fn(),
      findByModuleRoleIds: jest.fn(),
      findByModuleRoleAndRoute: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<RouteAccessRepository>;

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
    } as jest.Mocked<UserRepository>;

    service = new RouteAccessService(mockRouteAccessRepo, mockModuleRoleRepo, mockUserRepo);
    jest.clearAllMocks();
  });

  // === CRUD ===

  describe('createRule', () => {
    it('should create a route access rule (AC-052-01)', async () => {
      mockModuleRoleRepo.findById.mockResolvedValue(sampleModuleRole);
      mockRouteAccessRepo.findByModuleRoleAndRoute.mockResolvedValue(null);
      mockRouteAccessRepo.create.mockResolvedValue(sampleRule);

      const result = await service.createRule({
        moduleRoleId: 'mr-1',
        route: '/api/orders',
        methods: ['GET', 'POST'],
      });

      expect(result).toEqual(sampleRule);
      expect(mockRouteAccessRepo.create).toHaveBeenCalled();
    });

    it('should uppercase methods on create', async () => {
      mockModuleRoleRepo.findById.mockResolvedValue(sampleModuleRole);
      mockRouteAccessRepo.findByModuleRoleAndRoute.mockResolvedValue(null);
      mockRouteAccessRepo.create.mockResolvedValue(sampleRule);

      await service.createRule({
        moduleRoleId: 'mr-1',
        route: '/api/orders',
        methods: ['get', 'post'],
      });

      expect(mockRouteAccessRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ methods: ['GET', 'POST'] })
      );
    });

    it('should throw ValidationError when route is empty', async () => {
      await expect(
        service.createRule({ moduleRoleId: 'mr-1', route: '', methods: ['GET'] })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when moduleRoleId is empty', async () => {
      await expect(
        service.createRule({ moduleRoleId: '', route: '/api/orders', methods: ['GET'] })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when methods is empty', async () => {
      await expect(
        service.createRule({ moduleRoleId: 'mr-1', route: '/api/orders', methods: [] })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid HTTP methods', async () => {
      await expect(
        service.createRule({ moduleRoleId: 'mr-1', route: '/api/orders', methods: ['INVALID'] })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when module role not found', async () => {
      mockModuleRoleRepo.findById.mockResolvedValue(null);

      await expect(
        service.createRule({ moduleRoleId: 'nonexistent', route: '/api/orders', methods: ['GET'] })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ConflictError when rule already exists', async () => {
      mockModuleRoleRepo.findById.mockResolvedValue(sampleModuleRole);
      mockRouteAccessRepo.findByModuleRoleAndRoute.mockResolvedValue(sampleRule);

      await expect(
        service.createRule({ moduleRoleId: 'mr-1', route: '/api/orders', methods: ['GET'] })
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('getAllRules', () => {
    it('should return all rules (AC-052-03)', async () => {
      mockRouteAccessRepo.findAll.mockResolvedValue([sampleRule]);

      const result = await service.getAllRules();

      expect(result).toHaveLength(1);
    });

    it('should filter by moduleRoleId when provided', async () => {
      mockRouteAccessRepo.findByModuleRoleId.mockResolvedValue([sampleRule]);

      const result = await service.getAllRules('mr-1');

      expect(result).toHaveLength(1);
      expect(mockRouteAccessRepo.findByModuleRoleId).toHaveBeenCalledWith('mr-1');
    });
  });

  describe('getRuleById', () => {
    it('should return rule when found', async () => {
      mockRouteAccessRepo.findById.mockResolvedValue(sampleRule);

      const result = await service.getRuleById('rar-1');

      expect(result).toEqual(sampleRule);
    });

    it('should throw NotFoundError when not found', async () => {
      mockRouteAccessRepo.findById.mockResolvedValue(null);

      await expect(service.getRuleById('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateRule', () => {
    it('should update rule', async () => {
      mockRouteAccessRepo.findById.mockResolvedValue(sampleRule);
      mockRouteAccessRepo.update.mockResolvedValue({
        ...sampleRule,
        methods: ['GET', 'POST', 'DELETE'],
      });

      const result = await service.updateRule('rar-1', { methods: ['GET', 'POST', 'DELETE'] });

      expect(result.methods).toContain('DELETE');
    });

    it('should uppercase methods on update', async () => {
      mockRouteAccessRepo.findById.mockResolvedValue(sampleRule);
      mockRouteAccessRepo.update.mockResolvedValue(sampleRule);

      await service.updateRule('rar-1', { methods: ['get'] });

      expect(mockRouteAccessRepo.update).toHaveBeenCalledWith(
        'rar-1',
        expect.objectContaining({ methods: ['GET'] })
      );
    });

    it('should throw ValidationError for empty methods', async () => {
      mockRouteAccessRepo.findById.mockResolvedValue(sampleRule);

      await expect(service.updateRule('rar-1', { methods: [] })).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid methods', async () => {
      mockRouteAccessRepo.findById.mockResolvedValue(sampleRule);

      await expect(service.updateRule('rar-1', { methods: ['INVALID'] })).rejects.toThrow(
        ValidationError
      );
    });

    it('should throw NotFoundError when rule not found', async () => {
      mockRouteAccessRepo.findById.mockResolvedValue(null);

      await expect(service.updateRule('nonexistent', { methods: ['GET'] })).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('deleteRule', () => {
    it('should delete rule', async () => {
      mockRouteAccessRepo.findById.mockResolvedValue(sampleRule);
      mockRouteAccessRepo.delete.mockResolvedValue(true);

      await service.deleteRule('rar-1');

      expect(mockRouteAccessRepo.delete).toHaveBeenCalledWith('rar-1');
    });

    it('should throw NotFoundError when rule not found', async () => {
      mockRouteAccessRepo.findById.mockResolvedValue(null);

      await expect(service.deleteRule('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  // === Resolution ===

  describe('resolveForUser', () => {
    it('should resolve accessible routes for user', async () => {
      mockUserRepo.getUserRoles.mockResolvedValue([sampleUserRole]);
      mockModuleRoleRepo.getModuleRolesForUserRole.mockResolvedValue([sampleModuleRole]);
      mockRouteAccessRepo.findByModuleRoleIds.mockResolvedValue([sampleRule]);

      const result = await service.resolveForUser('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].route).toBe('/api/orders');
      expect(result[0].methods).toEqual(['GET', 'POST']);
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
      mockRouteAccessRepo.findByModuleRoleIds.mockResolvedValue([]);

      const result = await service.resolveForUser('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('canAccessRoute', () => {
    it('should return true when user has access (AC-052-02)', async () => {
      mockUserRepo.getUserRoles.mockResolvedValue([sampleUserRole]);
      mockModuleRoleRepo.getModuleRolesForUserRole.mockResolvedValue([sampleModuleRole]);
      mockRouteAccessRepo.findByModuleRoleIds.mockResolvedValue([sampleRule]);

      const result = await service.canAccessRoute('user-1', '/api/orders', 'GET');

      expect(result).toBe(true);
    });

    it('should return false when method not allowed (AC-052-06)', async () => {
      mockUserRepo.getUserRoles.mockResolvedValue([sampleUserRole]);
      mockModuleRoleRepo.getModuleRolesForUserRole.mockResolvedValue([sampleModuleRole]);
      mockRouteAccessRepo.findByModuleRoleIds.mockResolvedValue([sampleRule]); // GET, POST only

      const result = await service.canAccessRoute('user-1', '/api/orders', 'DELETE');

      expect(result).toBe(false);
    });

    it('should return false when route not matched', async () => {
      mockUserRepo.getUserRoles.mockResolvedValue([sampleUserRole]);
      mockModuleRoleRepo.getModuleRolesForUserRole.mockResolvedValue([sampleModuleRole]);
      mockRouteAccessRepo.findByModuleRoleIds.mockResolvedValue([sampleRule]);

      const result = await service.canAccessRoute('user-1', '/api/admin/users', 'GET');

      expect(result).toBe(false);
    });

    it('should return false when user has no roles', async () => {
      mockUserRepo.getUserRoles.mockResolvedValue([]);

      const result = await service.canAccessRoute('user-1', '/api/orders', 'GET');

      expect(result).toBe(false);
    });
  });

  // === Matching Logic ===

  describe('matchRoute', () => {
    it('should match exact route with matching method', () => {
      const rules: RouteAccessRule[] = [sampleRule];

      expect(service.matchRoute('/api/orders', 'GET', rules)).toBe(true);
    });

    it('should not match exact route with non-matching method (AC-052-06)', () => {
      const rules: RouteAccessRule[] = [sampleRule];

      expect(service.matchRoute('/api/orders', 'DELETE', rules)).toBe(false);
    });

    it('should not match different route', () => {
      const rules: RouteAccessRule[] = [sampleRule];

      expect(service.matchRoute('/api/users', 'GET', rules)).toBe(false);
    });

    it('should match wildcard route prefix (AC-052-04)', () => {
      const wildcardRule: RouteAccessRule = {
        ...sampleRule,
        route: '/api/orders/*',
        isWildcard: true,
      };

      expect(service.matchRoute('/api/orders/123', 'GET', [wildcardRule])).toBe(true);
    });

    it('should match wildcard route for nested paths', () => {
      const wildcardRule: RouteAccessRule = {
        ...sampleRule,
        route: '/api/orders/*',
        isWildcard: true,
      };

      expect(service.matchRoute('/api/orders/123/items', 'GET', [wildcardRule])).toBe(true);
    });

    it('should match wildcard route base path (without trailing segment)', () => {
      const wildcardRule: RouteAccessRule = {
        ...sampleRule,
        route: '/api/orders/*',
        isWildcard: true,
      };

      expect(service.matchRoute('/api/orders', 'GET', [wildcardRule])).toBe(true);
    });

    it('should not match wildcard for different route prefix', () => {
      const wildcardRule: RouteAccessRule = {
        ...sampleRule,
        route: '/api/orders/*',
        isWildcard: true,
      };

      expect(service.matchRoute('/api/users/123', 'GET', [wildcardRule])).toBe(false);
    });

    it('should return false for empty rules', () => {
      expect(service.matchRoute('/api/orders', 'GET', [])).toBe(false);
    });

    it('should match if any rule allows access', () => {
      const rules: RouteAccessRule[] = [
        { ...sampleRule, methods: ['GET'] },
        { ...sampleRule, id: 'rar-2', route: '/api/users', methods: ['POST'] },
      ];

      expect(service.matchRoute('/api/users', 'POST', rules)).toBe(true);
    });
  });

  // === Combine Rules ===

  describe('combineRules', () => {
    it('should merge methods for same route', () => {
      const rules: RouteAccessRule[] = [
        { ...sampleRule, methods: ['GET'] },
        { ...sampleRule, id: 'rar-2', moduleRoleId: 'mr-2', methods: ['POST', 'DELETE'] },
      ];

      const result = service.combineRules(rules);

      expect(result).toHaveLength(1);
      expect(result[0].methods).toEqual(['DELETE', 'GET', 'POST']); // sorted
    });

    it('should OR isWildcard across rules for same route', () => {
      const rules: RouteAccessRule[] = [
        { ...sampleRule, isWildcard: false },
        { ...sampleRule, id: 'rar-2', moduleRoleId: 'mr-2', isWildcard: true },
      ];

      const result = service.combineRules(rules);

      expect(result[0].isWildcard).toBe(true);
    });

    it('should group by route', () => {
      const rules: RouteAccessRule[] = [
        { ...sampleRule, route: '/api/orders', methods: ['GET'] },
        { ...sampleRule, id: 'rar-2', route: '/api/users', methods: ['POST'] },
      ];

      const result = service.combineRules(rules);

      expect(result).toHaveLength(2);
    });

    it('should return results sorted by route', () => {
      const rules: RouteAccessRule[] = [
        { ...sampleRule, route: '/api/zebra' },
        { ...sampleRule, id: 'rar-2', route: '/api/alpha' },
      ];

      const result = service.combineRules(rules);

      expect(result[0].route).toBe('/api/alpha');
      expect(result[1].route).toBe('/api/zebra');
    });

    it('should return empty array for no rules', () => {
      expect(service.combineRules([])).toEqual([]);
    });

    it('should deduplicate methods', () => {
      const rules: RouteAccessRule[] = [
        { ...sampleRule, methods: ['GET', 'POST'] },
        { ...sampleRule, id: 'rar-2', moduleRoleId: 'mr-2', methods: ['GET', 'DELETE'] },
      ];

      const result = service.combineRules(rules);

      expect(result[0].methods).toEqual(['DELETE', 'GET', 'POST']); // no duplicate GET
    });
  });
});
