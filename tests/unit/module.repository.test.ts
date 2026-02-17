// Unit tests for ModuleRepository
import { ModuleRepository } from '../../src/repositories/module.repository';
import { pool } from '../../src/config/database';

jest.mock('../../src/config/database', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn(),
  },
}));

describe('ModuleRepository', () => {
  let repo: ModuleRepository;
  const mockQuery = pool.query as jest.Mock;

  const sampleRow = {
    id: 'mod-1',
    name: 'Orders',
    description: 'Order management module',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  beforeEach(() => {
    repo = new ModuleRepository();
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all modules ordered by name', async () => {
      mockQuery.mockResolvedValue({ rows: [sampleRow] });

      const modules = await repo.findAll();

      expect(modules).toHaveLength(1);
      expect(modules[0].name).toBe('Orders');
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('ORDER BY name'));
    });

    it('should return empty array when no modules exist', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const modules = await repo.findAll();

      expect(modules).toHaveLength(0);
    });
  });

  describe('findById', () => {
    it('should return module when found', async () => {
      mockQuery.mockResolvedValue({ rows: [sampleRow] });

      const module = await repo.findById('mod-1');

      expect(module).not.toBeNull();
      expect(module!.name).toBe('Orders');
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('WHERE id = $1'), ['mod-1']);
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const module = await repo.findById('nonexistent');

      expect(module).toBeNull();
    });
  });

  describe('findByName', () => {
    it('should find module by name case-insensitively', async () => {
      mockQuery.mockResolvedValue({ rows: [sampleRow] });

      const module = await repo.findByName('orders');

      expect(module).not.toBeNull();
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('LOWER(name) = LOWER($1)'), [
        'orders',
      ]);
    });
  });

  describe('create', () => {
    it('should create and return new module', async () => {
      mockQuery.mockResolvedValue({ rows: [sampleRow] });

      const module = await repo.create({ name: 'Orders', description: 'Order management module' });

      expect(module.name).toBe('Orders');
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO modules'), [
        'Orders',
        'Order management module',
      ]);
    });

    it('should set description to null when not provided', async () => {
      mockQuery.mockResolvedValue({ rows: [sampleRow] });

      await repo.create({ name: 'Orders' });

      expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ['Orders', null]);
    });
  });

  describe('update', () => {
    it('should update module fields', async () => {
      mockQuery.mockResolvedValue({ rows: [{ ...sampleRow, name: 'OrdersV2' }] });

      const module = await repo.update('mod-1', { name: 'OrdersV2' });

      expect(module!.name).toBe('OrdersV2');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE modules SET name = $1'),
        ['OrdersV2', 'mod-1']
      );
    });

    it('should return existing module when no fields provided', async () => {
      mockQuery.mockResolvedValue({ rows: [sampleRow] });

      const module = await repo.update('mod-1', {});

      expect(module!.name).toBe('Orders');
    });
  });

  describe('delete', () => {
    it('should return true when module deleted', async () => {
      mockQuery.mockResolvedValue({ rowCount: 1 });

      const result = await repo.delete('mod-1');

      expect(result).toBe(true);
    });

    it('should return false when module not found', async () => {
      mockQuery.mockResolvedValue({ rowCount: 0 });

      const result = await repo.delete('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('hasModuleRoles', () => {
    it('should return true when module has roles', async () => {
      mockQuery.mockResolvedValue({ rows: [{ '?column?': 1 }] });

      const result = await repo.hasModuleRoles('mod-1');

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('module_roles'), ['mod-1']);
    });

    it('should return false when module has no roles', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repo.hasModuleRoles('mod-1');

      expect(result).toBe(false);
    });
  });
});
