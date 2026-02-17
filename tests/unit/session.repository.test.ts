// Unit tests for SessionRepository
import { SessionRepository } from '../../src/repositories/session.repository';
import { pool } from '../../src/config/database';

jest.mock('../../src/config/database', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn(),
  },
}));

describe('SessionRepository', () => {
  let repo: SessionRepository;
  const mockQuery = pool.query as jest.Mock;

  const now = '2026-01-01T00:00:00.000Z';

  const sessionRow = {
    id: 'session-1',
    user_id: 'user-1',
    csrf_token: 'csrf-token-abc',
    last_active: now,
    created_at: now,
  };

  beforeEach(() => {
    repo = new SessionRepository();
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should insert and return a session', async () => {
      mockQuery.mockResolvedValue({ rows: [sessionRow] });

      const result = await repo.create({ userId: 'user-1', csrfToken: 'csrf-token-abc' });

      expect(result.id).toBe('session-1');
      expect(result.userId).toBe('user-1');
      expect(result.csrfToken).toBe('csrf-token-abc');
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO sessions'), [
        'user-1',
        'csrf-token-abc',
      ]);
    });
  });

  describe('findById', () => {
    it('should return session when found', async () => {
      mockQuery.mockResolvedValue({ rows: [sessionRow] });

      const result = await repo.findById('session-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('session-1');
      expect(result!.lastActive).toBeInstanceOf(Date);
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updateLastActive', () => {
    it('should call update query', async () => {
      mockQuery.mockResolvedValue({ rowCount: 1 });

      await repo.updateLastActive('session-1');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE sessions SET last_active'),
        ['session-1']
      );
    });
  });

  describe('delete', () => {
    it('should return true when deleted', async () => {
      mockQuery.mockResolvedValue({ rowCount: 1 });

      const result = await repo.delete('session-1');

      expect(result).toBe(true);
    });

    it('should return false when not found', async () => {
      mockQuery.mockResolvedValue({ rowCount: 0 });

      const result = await repo.delete('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('deleteByUserId', () => {
    it('should delete all sessions for a user', async () => {
      mockQuery.mockResolvedValue({ rowCount: 3 });

      await repo.deleteByUserId('user-1');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM sessions WHERE user_id'),
        ['user-1']
      );
    });
  });
});
