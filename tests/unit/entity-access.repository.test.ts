// Unit tests for EntityAccessRepository
import { EntityAccessRepository } from '../../src/repositories/entity-access.repository';
import { EntityAccessRule } from '../../src/models/entity-access.model';

const mockQuery = jest.fn();
jest.mock('../../src/config/database', () => ({
  pool: { query: (...args: unknown[]) => mockQuery(...args) },
}));

describe('EntityAccessRepository', () => {
  let repo: EntityAccessRepository;

  const now = new Date('2026-01-01T00:00:00Z');

  const sampleRow = {
    id: 'ear-1',
    module_role_id: 'mr-1',
    entity: 'Order',
    can_create: true,
    can_read: true,
    can_update: false,
    can_delete: false,
    row_filter: { field: 'owner_id', op: 'eq', value: '$currentUser' },
    field_access: { email: 'read', name: 'readwrite' },
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  const expectedRule: EntityAccessRule = {
    id: 'ear-1',
    moduleRoleId: 'mr-1',
    entity: 'Order',
    canCreate: true,
    canRead: true,
    canUpdate: false,
    canDelete: false,
    rowFilter: { field: 'owner_id', op: 'eq', value: '$currentUser' },
    fieldAccess: { email: 'read', name: 'readwrite' },
    createdAt: now,
    updatedAt: now,
  };

  beforeEach(() => {
    repo = new EntityAccessRepository();
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all rules', async () => {
      mockQuery.mockResolvedValue({ rows: [sampleRow] });

      const result = await repo.findAll();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expectedRule);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('ORDER BY entity'));
    });
  });

  describe('findById', () => {
    it('should return rule when found', async () => {
      mockQuery.mockResolvedValue({ rows: [sampleRow] });

      const result = await repo.findById('ear-1');

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

  describe('findByModuleRoleAndEntity', () => {
    it('should return rule for module role and entity', async () => {
      mockQuery.mockResolvedValue({ rows: [sampleRow] });

      const result = await repo.findByModuleRoleAndEntity('mr-1', 'Order');

      expect(result).toEqual(expectedRule);
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repo.findByModuleRoleAndEntity('mr-1', 'Unknown');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a rule with all fields', async () => {
      mockQuery.mockResolvedValue({ rows: [sampleRow] });

      const result = await repo.create({
        moduleRoleId: 'mr-1',
        entity: 'Order',
        canCreate: true,
        canRead: true,
        rowFilter: { field: 'owner_id', op: 'eq', value: '$currentUser' },
        fieldAccess: { email: 'read', name: 'readwrite' },
      });

      expect(result).toEqual(expectedRule);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO entity_access_rules'),
        expect.arrayContaining(['mr-1', 'Order', true, true, false, false])
      );
    });

    it('should create with defaults when optional fields omitted', async () => {
      mockQuery.mockResolvedValue({
        rows: [
          {
            ...sampleRow,
            can_create: false,
            can_read: false,
            row_filter: null,
            field_access: null,
          },
        ],
      });

      await repo.create({ moduleRoleId: 'mr-1', entity: 'Order' });

      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT'), [
        'mr-1',
        'Order',
        false,
        false,
        false,
        false,
        null,
        null,
      ]);
    });
  });

  describe('update', () => {
    it('should update specified fields', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ ...sampleRow, can_update: true }],
      });

      const result = await repo.update('ear-1', { canUpdate: true });

      expect(result).toBeTruthy();
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('can_update = $1'), [
        true,
        'ear-1',
      ]);
    });

    it('should return existing rule when no fields to update', async () => {
      mockQuery.mockResolvedValue({ rows: [sampleRow] });

      const result = await repo.update('ear-1', {});

      expect(result).toEqual(expectedRule);
    });

    it('should return null when rule not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repo.update('nonexistent', { canCreate: true });

      expect(result).toBeNull();
    });

    it('should update rowFilter to null', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ ...sampleRow, row_filter: null }],
      });

      await repo.update('ear-1', { rowFilter: null });

      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('row_filter = $1'), [
        null,
        'ear-1',
      ]);
    });

    it('should update fieldAccess with JSON', async () => {
      const fa = { salary: 'none' as const };
      mockQuery.mockResolvedValue({
        rows: [{ ...sampleRow, field_access: fa }],
      });

      await repo.update('ear-1', { fieldAccess: fa });

      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('field_access = $1'), [
        JSON.stringify(fa),
        'ear-1',
      ]);
    });
  });

  describe('delete', () => {
    it('should return true when deleted', async () => {
      mockQuery.mockResolvedValue({ rowCount: 1 });

      const result = await repo.delete('ear-1');

      expect(result).toBe(true);
    });

    it('should return false when not found', async () => {
      mockQuery.mockResolvedValue({ rowCount: 0 });

      const result = await repo.delete('nonexistent');

      expect(result).toBe(false);
    });
  });
});
