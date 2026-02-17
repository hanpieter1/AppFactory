// Unit tests for UserRepository
import { UserRepository } from '../../src/repositories/user.repository';
import { UserType } from '../../src/models/user.model';
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

describe('UserRepository', () => {
  let repo: UserRepository;
  const mockQuery = pool.query as jest.Mock;
  const mockConnect = pool.connect as jest.Mock;

  const now = new Date('2026-01-01T00:00:00Z');
  const sampleRow = {
    id: 'user-1',
    name: 'john.doe',
    full_name: 'John Doe',
    email: 'john@example.com',
    active: true,
    blocked: false,
    blocked_since: null,
    failed_logins: 0,
    last_login: null,
    web_service_user: false,
    is_anonymous: false,
    is_local_user: true,
    user_type: 'Internal',
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  const roleRow = {
    id: 'role-1',
    name: 'User',
    description: 'Basic access',
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  beforeEach(() => {
    repo = new UserRepository();
    jest.clearAllMocks();
    mockConnect.mockResolvedValue(mockClient);
  });

  describe('findAll', () => {
    it('should return paginated result with defaults (page 1, limit 20)', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '1' }] })
        .mockResolvedValueOnce({ rows: [sampleRow] });

      const result = await repo.findAll();

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('john.doe');
      expect(result.pagination).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
    });

    it('should filter by active status', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '1' }] })
        .mockResolvedValueOnce({ rows: [sampleRow] });

      await repo.findAll({ active: true });

      expect(mockQuery.mock.calls[0][0]).toContain('u.active = $1');
      expect(mockQuery.mock.calls[0][1]).toEqual([true]);
    });

    it('should filter by webServiceUser', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      await repo.findAll({ webServiceUser: true });

      expect(mockQuery.mock.calls[0][0]).toContain('u.web_service_user = $1');
    });

    it('should filter by isLocalUser', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      await repo.findAll({ isLocalUser: false });

      expect(mockQuery.mock.calls[0][0]).toContain('u.is_local_user = $1');
      expect(mockQuery.mock.calls[0][1]).toEqual([false]);
    });

    it('should search by name and fullName using ILIKE', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '1' }] })
        .mockResolvedValueOnce({ rows: [sampleRow] });

      await repo.findAll({ search: 'john' });

      const countSql = mockQuery.mock.calls[0][0] as string;
      expect(countSql).toContain('ILIKE');
      expect(countSql).toContain('u.name');
      expect(countSql).toContain('u.full_name');
      expect(mockQuery.mock.calls[0][1]).toEqual(['%john%']);
    });

    it('should filter by role name with JOIN', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '1' }] })
        .mockResolvedValueOnce({ rows: [sampleRow] });

      await repo.findAll({ role: 'Administrator' });

      const countSql = mockQuery.mock.calls[0][0] as string;
      expect(countSql).toContain('JOIN user_user_roles');
      expect(countSql).toContain('JOIN user_roles');
      expect(countSql).toContain('LOWER(ur.name) = LOWER($1)');
    });

    it('should apply sorting', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      await repo.findAll({ sortBy: 'lastLogin', order: 'desc' });

      const dataSql = mockQuery.mock.calls[1][0] as string;
      expect(dataSql).toContain('u.last_login DESC');
    });

    it('should apply pagination with LIMIT and OFFSET', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '50' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await repo.findAll({ page: 3, limit: 10 });

      const dataValues = mockQuery.mock.calls[1][1] as unknown[];
      expect(dataValues).toContain(10);
      expect(dataValues).toContain(20); // offset = (3-1)*10
      expect(result.pagination.totalPages).toBe(5);
    });

    it('should cap limit at 100', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await repo.findAll({ limit: 999 });

      expect(result.pagination.limit).toBe(100);
    });

    it('should combine multiple filters', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      await repo.findAll({ active: true, webServiceUser: false, search: 'test' });

      const countSql = mockQuery.mock.calls[0][0] as string;
      expect(countSql).toContain('u.active = $1');
      expect(countSql).toContain('u.web_service_user = $2');
      expect(countSql).toContain('ILIKE $3');
    });

    it('should never select password column', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '1' }] })
        .mockResolvedValueOnce({ rows: [sampleRow] });

      await repo.findAll();

      const dataSql = mockQuery.mock.calls[1][0] as string;
      expect(dataSql).not.toContain('password');
    });

    it('should return totalPages 0 when no results', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await repo.findAll();

      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      mockQuery.mockResolvedValue({ rows: [sampleRow] });

      const user = await repo.findById('user-1');

      expect(user).not.toBeNull();
      expect(user!.id).toBe('user-1');
      expect(user!.fullName).toBe('John Doe');
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const user = await repo.findById('nonexistent');

      expect(user).toBeNull();
    });

    it('should never select password column', async () => {
      mockQuery.mockResolvedValue({ rows: [sampleRow] });

      await repo.findById('user-1');

      const sql = mockQuery.mock.calls[0][0] as string;
      expect(sql).not.toContain('password');
    });
  });

  describe('findByIdWithRoles', () => {
    it('should return user with roles', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [sampleRow] })
        .mockResolvedValueOnce({ rows: [roleRow] });

      const user = await repo.findByIdWithRoles('user-1');

      expect(user).not.toBeNull();
      expect(user!.roles).toHaveLength(1);
      expect(user!.roles[0].name).toBe('User');
    });

    it('should return null when user not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const user = await repo.findByIdWithRoles('nonexistent');

      expect(user).toBeNull();
    });
  });

  describe('findByName', () => {
    it('should find user case-insensitively', async () => {
      mockQuery.mockResolvedValue({ rows: [sampleRow] });

      const user = await repo.findByName('John.Doe');

      expect(user).not.toBeNull();
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('LOWER(name) = LOWER($1)'), [
        'John.Doe',
      ]);
    });
  });

  describe('findPasswordHashById', () => {
    it('should return password hash', async () => {
      mockQuery.mockResolvedValue({ rows: [{ password: '$2b$10$hash' }] });

      const hash = await repo.findPasswordHashById('user-1');

      expect(hash).toBe('$2b$10$hash');
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT password'), [
        'user-1',
      ]);
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const hash = await repo.findPasswordHashById('nonexistent');

      expect(hash).toBeNull();
    });
  });

  describe('create', () => {
    it('should insert and return new user', async () => {
      mockQuery.mockResolvedValue({ rows: [sampleRow] });

      const user = await repo.create({
        name: 'john.doe',
        password: '$2b$10$hash',
        fullName: 'John Doe',
        email: 'john@example.com',
        webServiceUser: false,
        isLocalUser: true,
        userType: UserType.Internal,
      });

      expect(user.name).toBe('john.doe');
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO users'), [
        'john.doe',
        '$2b$10$hash',
        'John Doe',
        'john@example.com',
        false,
        true,
        'Internal',
      ]);
    });
  });

  describe('update', () => {
    it('should update profile fields', async () => {
      mockQuery.mockResolvedValue({ rows: [{ ...sampleRow, full_name: 'Jane Doe' }] });

      const user = await repo.update('user-1', { fullName: 'Jane Doe' });

      expect(user).not.toBeNull();
      expect(user!.fullName).toBe('Jane Doe');
    });

    it('should return current user when no fields provided', async () => {
      mockQuery.mockResolvedValue({ rows: [sampleRow] });

      await repo.update('user-1', {});

      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('WHERE id = $1'), ['user-1']);
    });
  });

  describe('updatePassword', () => {
    it('should return true when password updated', async () => {
      mockQuery.mockResolvedValue({ rowCount: 1 });

      const result = await repo.updatePassword('user-1', '$2b$10$newhash');

      expect(result).toBe(true);
    });

    it('should return false when user not found', async () => {
      mockQuery.mockResolvedValue({ rowCount: 0 });

      const result = await repo.updatePassword('nonexistent', '$2b$10$newhash');

      expect(result).toBe(false);
    });
  });

  describe('updateStatus', () => {
    it('should update active and blocked fields', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ ...sampleRow, active: false, blocked: true }],
      });

      const user = await repo.updateStatus('user-1', { active: false, blocked: true });

      expect(user).not.toBeNull();
    });

    it('should handle null blockedSince', async () => {
      mockQuery.mockResolvedValue({ rows: [sampleRow] });

      await repo.updateStatus('user-1', { blockedSince: null, failedLogins: 0 });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('blocked_since'),
        expect.arrayContaining([null, 0])
      );
    });
  });

  describe('updateLastLogin', () => {
    it('should update last_login', async () => {
      mockQuery.mockResolvedValue({ rowCount: 1 });

      await repo.updateLastLogin('user-1');

      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('last_login = NOW()'), [
        'user-1',
      ]);
    });
  });

  describe('delete', () => {
    it('should return true when deleted', async () => {
      mockQuery.mockResolvedValue({ rowCount: 1 });

      expect(await repo.delete('user-1')).toBe(true);
    });

    it('should return false when not found', async () => {
      mockQuery.mockResolvedValue({ rowCount: 0 });

      expect(await repo.delete('nonexistent')).toBe(false);
    });
  });

  describe('getUserRoles', () => {
    it('should return roles for a user', async () => {
      mockQuery.mockResolvedValue({ rows: [roleRow] });

      const roles = await repo.getUserRoles('user-1');

      expect(roles).toHaveLength(1);
      expect(roles[0].name).toBe('User');
    });
  });

  describe('setUserRoles', () => {
    it('should replace roles in a transaction', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      await repo.setUserRoles('user-1', ['role-1', 'role-2']);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        'DELETE FROM user_user_roles WHERE user_id = $1',
        ['user-1']
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        'INSERT INTO user_user_roles (user_id, role_id) VALUES ($1, $2)',
        ['user-1', 'role-1']
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback on error', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('DB error'));

      await expect(repo.setUserRoles('user-1', ['role-1'])).rejects.toThrow('DB error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('isRoleAssignedToAnyUser', () => {
    it('should return true when role is assigned', async () => {
      mockQuery.mockResolvedValue({ rows: [{}] });

      expect(await repo.isRoleAssignedToAnyUser('role-1')).toBe(true);
    });

    it('should return false when role is not assigned', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      expect(await repo.isRoleAssignedToAnyUser('role-1')).toBe(false);
    });
  });
});
