// Unit tests for RoleRepository
import { RoleRepository } from '../../src/repositories/role.repository';
import { pool } from '../../src/config/database';

const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

jest.mock('../../src/config/database', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn(),
  },
}));

describe('RoleRepository', () => {
  let repo: RoleRepository;
  const mockQuery = pool.query as jest.Mock;
  const mockConnect = pool.connect as jest.Mock;

  const now = new Date('2026-01-01T00:00:00Z');
  const sampleRow = {
    id: 'role-1',
    name: 'Administrator',
    description: 'Full access',
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  beforeEach(() => {
    repo = new RoleRepository();
    jest.clearAllMocks();
    mockConnect.mockResolvedValue(mockClient);
  });

  describe('findAll', () => {
    it('should return all roles ordered by name', async () => {
      mockQuery.mockResolvedValue({ rows: [sampleRow] });

      const roles = await repo.findAll();

      expect(roles).toHaveLength(1);
      expect(roles[0].id).toBe('role-1');
      expect(roles[0].name).toBe('Administrator');
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('ORDER BY name'));
    });

    it('should return empty array when no roles exist', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const roles = await repo.findAll();

      expect(roles).toHaveLength(0);
    });
  });

  describe('findById', () => {
    it('should return role when found', async () => {
      mockQuery.mockResolvedValue({ rows: [sampleRow] });

      const role = await repo.findById('role-1');

      expect(role).not.toBeNull();
      expect(role!.id).toBe('role-1');
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('WHERE id = $1'), ['role-1']);
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const role = await repo.findById('nonexistent');

      expect(role).toBeNull();
    });
  });

  describe('findByIdWithGrantable', () => {
    it('should return role with grantable roles', async () => {
      const grantableRow = {
        id: 'role-2',
        name: 'User',
        description: 'Basic access',
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [sampleRow] })
        .mockResolvedValueOnce({ rows: [grantableRow] });

      const role = await repo.findByIdWithGrantable('role-1');

      expect(role).not.toBeNull();
      expect(role!.grantableRoles).toHaveLength(1);
      expect(role!.grantableRoles[0].name).toBe('User');
    });

    it('should return null when role not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const role = await repo.findByIdWithGrantable('nonexistent');

      expect(role).toBeNull();
    });
  });

  describe('findByName', () => {
    it('should find role by name case-insensitively', async () => {
      mockQuery.mockResolvedValue({ rows: [sampleRow] });

      const role = await repo.findByName('administrator');

      expect(role).not.toBeNull();
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('LOWER(name) = LOWER($1)'), [
        'administrator',
      ]);
    });
  });

  describe('create', () => {
    it('should insert and return new role', async () => {
      mockQuery.mockResolvedValue({ rows: [sampleRow] });

      const role = await repo.create({ name: 'Administrator', description: 'Full access' });

      expect(role.name).toBe('Administrator');
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO user_roles'), [
        'Administrator',
        'Full access',
      ]);
    });

    it('should handle null description', async () => {
      mockQuery.mockResolvedValue({ rows: [{ ...sampleRow, description: null }] });

      const role = await repo.create({ name: 'Editor' });

      expect(role.description).toBeNull();
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO user_roles'), [
        'Editor',
        null,
      ]);
    });
  });

  describe('update', () => {
    it('should update name and return updated role', async () => {
      mockQuery.mockResolvedValue({ rows: [{ ...sampleRow, name: 'SuperAdmin' }] });

      const role = await repo.update('role-1', { name: 'SuperAdmin' });

      expect(role).not.toBeNull();
      expect(role!.name).toBe('SuperAdmin');
    });

    it('should return current role when no fields provided', async () => {
      mockQuery.mockResolvedValue({ rows: [sampleRow] });

      const role = await repo.update('role-1', {});

      expect(role).not.toBeNull();
      // Falls through to findById
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('WHERE id = $1'), ['role-1']);
    });
  });

  describe('delete', () => {
    it('should return true when role deleted', async () => {
      mockQuery.mockResolvedValue({ rowCount: 1 });

      const result = await repo.delete('role-1');

      expect(result).toBe(true);
    });

    it('should return false when role not found', async () => {
      mockQuery.mockResolvedValue({ rowCount: 0 });

      const result = await repo.delete('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('isRoleReferencedAsGrantable', () => {
    it('should return true when role is referenced', async () => {
      mockQuery.mockResolvedValue({ rows: [{ '?column?': 1 }] });

      const result = await repo.isRoleReferencedAsGrantable('role-2');

      expect(result).toBe(true);
    });

    it('should return false when role is not referenced', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repo.isRoleReferencedAsGrantable('role-1');

      expect(result).toBe(false);
    });
  });

  describe('getGrantableRoles', () => {
    it('should return grantable roles for a role', async () => {
      mockQuery.mockResolvedValue({ rows: [sampleRow] });

      const roles = await repo.getGrantableRoles('role-1');

      expect(roles).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('user_role_grantable_roles'), [
        'role-1',
      ]);
    });
  });

  describe('getGrantableRoleIdsForRoles', () => {
    it('should return distinct grantable role IDs for multiple roles', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ grantable_role_id: 'role-2' }, { grantable_role_id: 'role-3' }],
      });

      const result = await repo.getGrantableRoleIdsForRoles(['role-1', 'role-4']);

      expect(result).toEqual(['role-2', 'role-3']);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('WHERE role_id IN ($1, $2)'), [
        'role-1',
        'role-4',
      ]);
    });

    it('should return empty array when no role IDs provided', async () => {
      const result = await repo.getGrantableRoleIdsForRoles([]);

      expect(result).toEqual([]);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should return empty array when no grantable roles exist', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repo.getGrantableRoleIdsForRoles(['role-1']);

      expect(result).toEqual([]);
    });
  });

  describe('setGrantableRoles', () => {
    it('should replace grantable roles in a transaction', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      await repo.setGrantableRoles('role-1', ['role-2', 'role-3']);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        'DELETE FROM user_role_grantable_roles WHERE role_id = $1',
        ['role-1']
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        'INSERT INTO user_role_grantable_roles (role_id, grantable_role_id) VALUES ($1, $2)',
        ['role-1', 'role-2']
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        'INSERT INTO user_role_grantable_roles (role_id, grantable_role_id) VALUES ($1, $2)',
        ['role-1', 'role-3']
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback on error', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('DB error')); // DELETE fails

      await expect(repo.setGrantableRoles('role-1', ['role-2'])).rejects.toThrow('DB error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
