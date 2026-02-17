// Unit tests for RouteAccessRepository
import { RouteAccessRepository } from '../../src/repositories/route-access.repository';
import { RouteAccessRule } from '../../src/models/route-access.model';

const mockQuery = jest.fn();
jest.mock('../../src/config/database', () => ({
  pool: { query: (...args: unknown[]) => mockQuery(...args) },
}));

describe('RouteAccessRepository', () => {
  let repo: RouteAccessRepository;

  const now = new Date('2026-01-01T00:00:00Z');

  const sampleRow = {
    id: 'rar-1',
    module_role_id: 'mr-1',
    route: '/api/orders',
    methods: ['GET', 'POST'],
    is_wildcard: false,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  const expectedRule: RouteAccessRule = {
    id: 'rar-1',
    moduleRoleId: 'mr-1',
    route: '/api/orders',
    methods: ['GET', 'POST'],
    isWildcard: false,
    createdAt: now,
    updatedAt: now,
  };

  beforeEach(() => {
    repo = new RouteAccessRepository();
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all rules', async () => {
      mockQuery.mockResolvedValue({ rows: [sampleRow] });

      const result = await repo.findAll();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expectedRule);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('ORDER BY route'));
    });
  });

  describe('findById', () => {
    it('should return rule when found', async () => {
      mockQuery.mockResolvedValue({ rows: [sampleRow] });

      const result = await repo.findById('rar-1');

      expect(result).toEqual(expectedRule);
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByModuleRoleId', () => {
    it('should return rules for module role', async () => {
      mockQuery.mockResolvedValue({ rows: [sampleRow] });

      const result = await repo.findByModuleRoleId('mr-1');

      expect(result).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('module_role_id = $1'), [
        'mr-1',
      ]);
    });
  });

  describe('findByModuleRoleIds', () => {
    it('should return rules for multiple module role IDs', async () => {
      mockQuery.mockResolvedValue({ rows: [sampleRow] });

      const result = await repo.findByModuleRoleIds(['mr-1', 'mr-2']);

      expect(result).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('ANY($1)'), [
        ['mr-1', 'mr-2'],
      ]);
    });

    it('should return empty array for empty input', async () => {
      const result = await repo.findByModuleRoleIds([]);

      expect(result).toEqual([]);
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('findByModuleRoleAndRoute', () => {
    it('should return rule for module role and route', async () => {
      mockQuery.mockResolvedValue({ rows: [sampleRow] });

      const result = await repo.findByModuleRoleAndRoute('mr-1', '/api/orders');

      expect(result).toEqual(expectedRule);
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repo.findByModuleRoleAndRoute('mr-1', '/api/unknown');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a rule', async () => {
      mockQuery.mockResolvedValue({ rows: [sampleRow] });

      const result = await repo.create({
        moduleRoleId: 'mr-1',
        route: '/api/orders',
        methods: ['GET', 'POST'],
      });

      expect(result).toEqual(expectedRule);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO route_access_rules'),
        ['mr-1', '/api/orders', ['GET', 'POST'], false]
      );
    });

    it('should create with isWildcard true', async () => {
      mockQuery.mockResolvedValue({ rows: [{ ...sampleRow, is_wildcard: true }] });

      await repo.create({
        moduleRoleId: 'mr-1',
        route: '/api/orders/*',
        methods: ['GET'],
        isWildcard: true,
      });

      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT'), [
        'mr-1',
        '/api/orders/*',
        ['GET'],
        true,
      ]);
    });
  });

  describe('update', () => {
    it('should update methods', async () => {
      mockQuery.mockResolvedValue({ rows: [{ ...sampleRow, methods: ['GET', 'POST', 'DELETE'] }] });

      const result = await repo.update('rar-1', { methods: ['GET', 'POST', 'DELETE'] });

      expect(result).toBeTruthy();
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('methods = $1'), [
        ['GET', 'POST', 'DELETE'],
        'rar-1',
      ]);
    });

    it('should update isWildcard', async () => {
      mockQuery.mockResolvedValue({ rows: [{ ...sampleRow, is_wildcard: true }] });

      await repo.update('rar-1', { isWildcard: true });

      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('is_wildcard = $1'), [
        true,
        'rar-1',
      ]);
    });

    it('should return existing rule when no fields to update', async () => {
      mockQuery.mockResolvedValue({ rows: [sampleRow] });

      const result = await repo.update('rar-1', {});

      expect(result).toEqual(expectedRule);
    });

    it('should return null when rule not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repo.update('nonexistent', { methods: ['GET'] });

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should return true when deleted', async () => {
      mockQuery.mockResolvedValue({ rowCount: 1 });

      const result = await repo.delete('rar-1');

      expect(result).toBe(true);
    });

    it('should return false when not found', async () => {
      mockQuery.mockResolvedValue({ rowCount: 0 });

      const result = await repo.delete('nonexistent');

      expect(result).toBe(false);
    });
  });
});
