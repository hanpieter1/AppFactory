// Unit tests for ModuleRoleRepository
import { ModuleRoleRepository } from '../../src/repositories/module-role.repository';
import { pool } from '../../src/config/database';

jest.mock('../../src/config/database', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn(),
  },
}));

describe('ModuleRoleRepository', () => {
  let repo: ModuleRoleRepository;
  const mockQuery = pool.query as jest.Mock;

  const sampleRow = {
    id: 'mr-1',
    module_id: 'mod-1',
    name: 'OrderEditor',
    description: 'Can edit orders',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  beforeEach(() => {
    repo = new ModuleRoleRepository();
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return module role when found', async () => {
      mockQuery.mockResolvedValue({ rows: [sampleRow] });

      const role = await repo.findById('mr-1');

      expect(role).not.toBeNull();
      expect(role!.name).toBe('OrderEditor');
      expect(role!.moduleId).toBe('mod-1');
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const role = await repo.findById('nonexistent');

      expect(role).toBeNull();
    });
  });

  describe('findByModuleId', () => {
    it('should return all roles for a module', async () => {
      mockQuery.mockResolvedValue({ rows: [sampleRow] });

      const roles = await repo.findByModuleId('mod-1');

      expect(roles).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('WHERE module_id = $1'), [
        'mod-1',
      ]);
    });

    it('should return empty array when no roles exist', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const roles = await repo.findByModuleId('mod-1');

      expect(roles).toHaveLength(0);
    });
  });

  describe('findByNameInModule', () => {
    it('should find role by name within module', async () => {
      mockQuery.mockResolvedValue({ rows: [sampleRow] });

      const role = await repo.findByNameInModule('mod-1', 'OrderEditor');

      expect(role).not.toBeNull();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('module_id = $1 AND LOWER(name) = LOWER($2)'),
        ['mod-1', 'OrderEditor']
      );
    });
  });

  describe('create', () => {
    it('should create and return new module role', async () => {
      mockQuery.mockResolvedValue({ rows: [sampleRow] });

      const role = await repo.create('mod-1', {
        name: 'OrderEditor',
        description: 'Can edit orders',
      });

      expect(role.name).toBe('OrderEditor');
      expect(role.moduleId).toBe('mod-1');
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO module_roles'), [
        'mod-1',
        'OrderEditor',
        'Can edit orders',
      ]);
    });
  });

  describe('update', () => {
    it('should update module role fields', async () => {
      mockQuery.mockResolvedValue({ rows: [{ ...sampleRow, name: 'OrderAdmin' }] });

      const role = await repo.update('mr-1', { name: 'OrderAdmin' });

      expect(role!.name).toBe('OrderAdmin');
    });

    it('should return existing role when no fields provided', async () => {
      mockQuery.mockResolvedValue({ rows: [sampleRow] });

      const role = await repo.update('mr-1', {});

      expect(role!.name).toBe('OrderEditor');
    });
  });

  describe('delete', () => {
    it('should return true when role deleted', async () => {
      mockQuery.mockResolvedValue({ rowCount: 1 });

      const result = await repo.delete('mr-1');

      expect(result).toBe(true);
    });

    it('should return false when role not found', async () => {
      mockQuery.mockResolvedValue({ rowCount: 0 });

      const result = await repo.delete('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('isModuleRoleMapped', () => {
    it('should return true when mapped to user roles', async () => {
      mockQuery.mockResolvedValue({ rows: [{ '?column?': 1 }] });

      const result = await repo.isModuleRoleMapped('mr-1');

      expect(result).toBe(true);
    });

    it('should return false when not mapped', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repo.isModuleRoleMapped('mr-1');

      expect(result).toBe(false);
    });
  });

  describe('getModuleRolesForUserRole', () => {
    it('should return module roles mapped to a user role', async () => {
      mockQuery.mockResolvedValue({ rows: [sampleRow] });

      const roles = await repo.getModuleRolesForUserRole('role-1');

      expect(roles).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('user_role_module_roles'), [
        'role-1',
      ]);
    });
  });

  describe('addModuleRoleToUserRole', () => {
    it('should insert mapping record', async () => {
      mockQuery.mockResolvedValue({ rowCount: 1 });

      await repo.addModuleRoleToUserRole('role-1', 'mr-1');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_role_module_roles'),
        ['role-1', 'mr-1']
      );
    });
  });

  describe('removeModuleRoleFromUserRole', () => {
    it('should return true when mapping removed', async () => {
      mockQuery.mockResolvedValue({ rowCount: 1 });

      const result = await repo.removeModuleRoleFromUserRole('role-1', 'mr-1');

      expect(result).toBe(true);
    });

    it('should return false when mapping not found', async () => {
      mockQuery.mockResolvedValue({ rowCount: 0 });

      const result = await repo.removeModuleRoleFromUserRole('role-1', 'mr-1');

      expect(result).toBe(false);
    });
  });

  describe('isMappingExists', () => {
    it('should return true when mapping exists', async () => {
      mockQuery.mockResolvedValue({ rows: [{ '?column?': 1 }] });

      const result = await repo.isMappingExists('role-1', 'mr-1');

      expect(result).toBe(true);
    });

    it('should return false when mapping does not exist', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repo.isMappingExists('role-1', 'mr-1');

      expect(result).toBe(false);
    });
  });
});
