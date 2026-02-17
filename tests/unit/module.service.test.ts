// Unit tests for ModuleService
import { ModuleService } from '../../src/services/module.service';
import { ModuleRepository } from '../../src/repositories/module.repository';
import { ModuleRoleRepository } from '../../src/repositories/module-role.repository';
import { RoleRepository } from '../../src/repositories/role.repository';
import { NotFoundError, ConflictError, ValidationError } from '../../src/utils/errors';
import { Module, ModuleRole } from '../../src/models/module.model';
import { UserRole } from '../../src/models/role.model';

jest.mock('../../src/config/database', () => ({
  pool: { query: jest.fn(), connect: jest.fn() },
}));

describe('ModuleService', () => {
  let service: ModuleService;
  let mockModuleRepo: jest.Mocked<ModuleRepository>;
  let mockModuleRoleRepo: jest.Mocked<ModuleRoleRepository>;
  let mockRoleRepo: jest.Mocked<RoleRepository>;

  const now = new Date('2026-01-01T00:00:00Z');

  const sampleModule: Module = {
    id: 'mod-1',
    name: 'Orders',
    description: 'Order management',
    createdAt: now,
    updatedAt: now,
  };

  const sampleModuleRole: ModuleRole = {
    id: 'mr-1',
    moduleId: 'mod-1',
    name: 'OrderEditor',
    description: 'Can edit orders',
    createdAt: now,
    updatedAt: now,
  };

  const sampleUserRole: UserRole = {
    id: 'role-1',
    name: 'Manager',
    description: 'Team management',
    createdAt: now,
    updatedAt: now,
  };

  beforeEach(() => {
    mockModuleRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      hasModuleRoles: jest.fn(),
    } as jest.Mocked<ModuleRepository>;

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

    mockRoleRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByIdWithGrantable: jest.fn(),
      findByName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      isRoleAssignedToUsers: jest.fn(),
      isRoleReferencedAsGrantable: jest.fn(),
      getGrantableRoles: jest.fn(),
      getGrantableRoleIdsForRoles: jest.fn(),
      setGrantableRoles: jest.fn(),
    } as jest.Mocked<RoleRepository>;

    service = new ModuleService(mockModuleRepo, mockModuleRoleRepo, mockRoleRepo);
    jest.clearAllMocks();
  });

  // === Module CRUD ===

  describe('createModule', () => {
    it('should create a module', async () => {
      mockModuleRepo.findByName.mockResolvedValue(null);
      mockModuleRepo.create.mockResolvedValue(sampleModule);

      const result = await service.createModule({
        name: 'Orders',
        description: 'Order management',
      });

      expect(result).toEqual(sampleModule);
      expect(mockModuleRepo.create).toHaveBeenCalled();
    });

    it('should throw ValidationError when name is empty', async () => {
      await expect(service.createModule({ name: '' })).rejects.toThrow(ValidationError);
    });

    it('should throw ConflictError when name already exists', async () => {
      mockModuleRepo.findByName.mockResolvedValue(sampleModule);

      await expect(service.createModule({ name: 'Orders' })).rejects.toThrow(ConflictError);
    });
  });

  describe('getAllModules', () => {
    it('should return all modules', async () => {
      mockModuleRepo.findAll.mockResolvedValue([sampleModule]);

      const result = await service.getAllModules();

      expect(result).toHaveLength(1);
    });
  });

  describe('getModuleById', () => {
    it('should return module when found', async () => {
      mockModuleRepo.findById.mockResolvedValue(sampleModule);

      const result = await service.getModuleById('mod-1');

      expect(result.name).toBe('Orders');
    });

    it('should throw NotFoundError when not found', async () => {
      mockModuleRepo.findById.mockResolvedValue(null);

      await expect(service.getModuleById('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateModule', () => {
    it('should update module', async () => {
      mockModuleRepo.findById.mockResolvedValue(sampleModule);
      mockModuleRepo.findByName.mockResolvedValue(null);
      mockModuleRepo.update.mockResolvedValue({ ...sampleModule, name: 'OrdersV2' });

      const result = await service.updateModule('mod-1', { name: 'OrdersV2' });

      expect(result.name).toBe('OrdersV2');
    });

    it('should throw NotFoundError when module not found', async () => {
      mockModuleRepo.findById.mockResolvedValue(null);

      await expect(service.updateModule('nonexistent', { name: 'New' })).rejects.toThrow(
        NotFoundError
      );
    });

    it('should throw ValidationError when name is empty', async () => {
      mockModuleRepo.findById.mockResolvedValue(sampleModule);

      await expect(service.updateModule('mod-1', { name: '' })).rejects.toThrow(ValidationError);
    });

    it('should throw ConflictError when name conflicts', async () => {
      mockModuleRepo.findById.mockResolvedValue(sampleModule);
      mockModuleRepo.findByName.mockResolvedValue({ ...sampleModule, id: 'mod-other' });

      await expect(service.updateModule('mod-1', { name: 'Orders' })).rejects.toThrow(
        ConflictError
      );
    });
  });

  describe('deleteModule', () => {
    it('should delete module', async () => {
      mockModuleRepo.findById.mockResolvedValue(sampleModule);
      mockModuleRepo.hasModuleRoles.mockResolvedValue(false);
      mockModuleRepo.delete.mockResolvedValue(true);

      await service.deleteModule('mod-1');

      expect(mockModuleRepo.delete).toHaveBeenCalledWith('mod-1');
    });

    it('should throw NotFoundError when module not found', async () => {
      mockModuleRepo.findById.mockResolvedValue(null);

      await expect(service.deleteModule('nonexistent')).rejects.toThrow(NotFoundError);
    });

    it('should throw ConflictError when module has roles', async () => {
      mockModuleRepo.findById.mockResolvedValue(sampleModule);
      mockModuleRepo.hasModuleRoles.mockResolvedValue(true);

      await expect(service.deleteModule('mod-1')).rejects.toThrow(ConflictError);
    });
  });

  // === ModuleRole CRUD ===

  describe('createModuleRole', () => {
    it('should create a module role', async () => {
      mockModuleRepo.findById.mockResolvedValue(sampleModule);
      mockModuleRoleRepo.findByNameInModule.mockResolvedValue(null);
      mockModuleRoleRepo.create.mockResolvedValue(sampleModuleRole);

      const result = await service.createModuleRole('mod-1', {
        name: 'OrderEditor',
        description: 'Can edit orders',
      });

      expect(result.name).toBe('OrderEditor');
    });

    it('should throw NotFoundError when module not found', async () => {
      mockModuleRepo.findById.mockResolvedValue(null);

      await expect(service.createModuleRole('nonexistent', { name: 'Editor' })).rejects.toThrow(
        NotFoundError
      );
    });

    it('should throw ValidationError when name is empty', async () => {
      mockModuleRepo.findById.mockResolvedValue(sampleModule);

      await expect(service.createModuleRole('mod-1', { name: '' })).rejects.toThrow(
        ValidationError
      );
    });

    it('should throw ConflictError when name already exists in module (AC-050-06)', async () => {
      mockModuleRepo.findById.mockResolvedValue(sampleModule);
      mockModuleRoleRepo.findByNameInModule.mockResolvedValue(sampleModuleRole);

      await expect(service.createModuleRole('mod-1', { name: 'OrderEditor' })).rejects.toThrow(
        ConflictError
      );
    });
  });

  describe('getModuleRolesByModule', () => {
    it('should return roles for a module', async () => {
      mockModuleRepo.findById.mockResolvedValue(sampleModule);
      mockModuleRoleRepo.findByModuleId.mockResolvedValue([sampleModuleRole]);

      const result = await service.getModuleRolesByModule('mod-1');

      expect(result).toHaveLength(1);
    });

    it('should throw NotFoundError when module not found', async () => {
      mockModuleRepo.findById.mockResolvedValue(null);

      await expect(service.getModuleRolesByModule('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getModuleRoleById', () => {
    it('should return module role', async () => {
      mockModuleRepo.findById.mockResolvedValue(sampleModule);
      mockModuleRoleRepo.findById.mockResolvedValue(sampleModuleRole);

      const result = await service.getModuleRoleById('mod-1', 'mr-1');

      expect(result.name).toBe('OrderEditor');
    });

    it('should throw NotFoundError when module not found', async () => {
      mockModuleRepo.findById.mockResolvedValue(null);

      await expect(service.getModuleRoleById('nonexistent', 'mr-1')).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when role not in module', async () => {
      mockModuleRepo.findById.mockResolvedValue(sampleModule);
      mockModuleRoleRepo.findById.mockResolvedValue({ ...sampleModuleRole, moduleId: 'other-mod' });

      await expect(service.getModuleRoleById('mod-1', 'mr-1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateModuleRole', () => {
    it('should update module role', async () => {
      mockModuleRepo.findById.mockResolvedValue(sampleModule);
      mockModuleRoleRepo.findById.mockResolvedValue(sampleModuleRole);
      mockModuleRoleRepo.findByNameInModule.mockResolvedValue(null);
      mockModuleRoleRepo.update.mockResolvedValue({ ...sampleModuleRole, name: 'OrderAdmin' });

      const result = await service.updateModuleRole('mod-1', 'mr-1', { name: 'OrderAdmin' });

      expect(result.name).toBe('OrderAdmin');
    });

    it('should throw ConflictError when name conflicts within module', async () => {
      mockModuleRepo.findById.mockResolvedValue(sampleModule);
      mockModuleRoleRepo.findById.mockResolvedValue(sampleModuleRole);
      mockModuleRoleRepo.findByNameInModule.mockResolvedValue({
        ...sampleModuleRole,
        id: 'mr-other',
      });

      await expect(
        service.updateModuleRole('mod-1', 'mr-1', { name: 'OrderEditor' })
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('deleteModuleRole', () => {
    it('should delete module role', async () => {
      mockModuleRepo.findById.mockResolvedValue(sampleModule);
      mockModuleRoleRepo.findById.mockResolvedValue(sampleModuleRole);
      mockModuleRoleRepo.isModuleRoleMapped.mockResolvedValue(false);
      mockModuleRoleRepo.delete.mockResolvedValue(true);

      await service.deleteModuleRole('mod-1', 'mr-1');

      expect(mockModuleRoleRepo.delete).toHaveBeenCalledWith('mr-1');
    });

    it('should throw ConflictError when mapped to user roles', async () => {
      mockModuleRepo.findById.mockResolvedValue(sampleModule);
      mockModuleRoleRepo.findById.mockResolvedValue(sampleModuleRole);
      mockModuleRoleRepo.isModuleRoleMapped.mockResolvedValue(true);

      await expect(service.deleteModuleRole('mod-1', 'mr-1')).rejects.toThrow(ConflictError);
    });
  });

  // === Mapping ===

  describe('mapModuleRoleToUserRole', () => {
    it('should map module role to user role (AC-050-03)', async () => {
      mockRoleRepo.findById.mockResolvedValue(sampleUserRole);
      mockModuleRoleRepo.findById.mockResolvedValue(sampleModuleRole);
      mockModuleRoleRepo.isMappingExists.mockResolvedValue(false);
      mockModuleRoleRepo.addModuleRoleToUserRole.mockResolvedValue(undefined);
      mockModuleRoleRepo.getModuleRolesForUserRole.mockResolvedValue([sampleModuleRole]);

      const result = await service.mapModuleRoleToUserRole('role-1', 'mr-1');

      expect(result).toHaveLength(1);
      expect(mockModuleRoleRepo.addModuleRoleToUserRole).toHaveBeenCalledWith('role-1', 'mr-1');
    });

    it('should throw NotFoundError when user role not found', async () => {
      mockRoleRepo.findById.mockResolvedValue(null);

      await expect(service.mapModuleRoleToUserRole('nonexistent', 'mr-1')).rejects.toThrow(
        NotFoundError
      );
    });

    it('should throw NotFoundError when module role not found', async () => {
      mockRoleRepo.findById.mockResolvedValue(sampleUserRole);
      mockModuleRoleRepo.findById.mockResolvedValue(null);

      await expect(service.mapModuleRoleToUserRole('role-1', 'nonexistent')).rejects.toThrow(
        NotFoundError
      );
    });

    it('should throw ConflictError when mapping already exists', async () => {
      mockRoleRepo.findById.mockResolvedValue(sampleUserRole);
      mockModuleRoleRepo.findById.mockResolvedValue(sampleModuleRole);
      mockModuleRoleRepo.isMappingExists.mockResolvedValue(true);

      await expect(service.mapModuleRoleToUserRole('role-1', 'mr-1')).rejects.toThrow(
        ConflictError
      );
    });
  });

  describe('getModuleRolesForUserRole', () => {
    it('should return mapped module roles (AC-050-04)', async () => {
      mockRoleRepo.findById.mockResolvedValue(sampleUserRole);
      mockModuleRoleRepo.getModuleRolesForUserRole.mockResolvedValue([sampleModuleRole]);

      const result = await service.getModuleRolesForUserRole('role-1');

      expect(result).toHaveLength(1);
    });

    it('should throw NotFoundError when user role not found', async () => {
      mockRoleRepo.findById.mockResolvedValue(null);

      await expect(service.getModuleRolesForUserRole('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('unmapModuleRoleFromUserRole', () => {
    it('should remove mapping (AC-050-05)', async () => {
      mockRoleRepo.findById.mockResolvedValue(sampleUserRole);
      mockModuleRoleRepo.removeModuleRoleFromUserRole.mockResolvedValue(true);

      await service.unmapModuleRoleFromUserRole('role-1', 'mr-1');

      expect(mockModuleRoleRepo.removeModuleRoleFromUserRole).toHaveBeenCalledWith(
        'role-1',
        'mr-1'
      );
    });

    it('should throw NotFoundError when user role not found', async () => {
      mockRoleRepo.findById.mockResolvedValue(null);

      await expect(service.unmapModuleRoleFromUserRole('nonexistent', 'mr-1')).rejects.toThrow(
        NotFoundError
      );
    });

    it('should throw NotFoundError when mapping not found', async () => {
      mockRoleRepo.findById.mockResolvedValue(sampleUserRole);
      mockModuleRoleRepo.removeModuleRoleFromUserRole.mockResolvedValue(false);

      await expect(service.unmapModuleRoleFromUserRole('role-1', 'mr-1')).rejects.toThrow(
        NotFoundError
      );
    });
  });
});
