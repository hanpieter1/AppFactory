// Unit tests for TokenRepository
import { TokenRepository } from '../../src/repositories/token.repository';
import { pool } from '../../src/config/database';

jest.mock('../../src/config/database', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn(),
  },
}));

describe('TokenRepository', () => {
  let repo: TokenRepository;
  const mockQuery = pool.query as jest.Mock;

  const now = '2026-01-01T00:00:00.000Z';
  const expiry = '2026-01-08T00:00:00.000Z';

  const tokenRow = {
    id: 'token-1',
    user_id: 'user-1',
    session_id: 'session-1',
    token_hash: 'abc123hash',
    expiry_date: expiry,
    user_agent: 'Mozilla/5.0',
    created_at: now,
  };

  beforeEach(() => {
    repo = new TokenRepository();
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should insert and return token information', async () => {
      mockQuery.mockResolvedValue({ rows: [tokenRow] });

      const result = await repo.create({
        userId: 'user-1',
        sessionId: 'session-1',
        tokenHash: 'abc123hash',
        expiryDate: new Date(expiry),
        userAgent: 'Mozilla/5.0',
      });

      expect(result.id).toBe('token-1');
      expect(result.userId).toBe('user-1');
      expect(result.sessionId).toBe('session-1');
      expect(result.tokenHash).toBe('abc123hash');
      expect(result.expiryDate).toBeInstanceOf(Date);
      expect(result.userAgent).toBe('Mozilla/5.0');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO token_information'),
        ['user-1', 'session-1', 'abc123hash', new Date(expiry), 'Mozilla/5.0']
      );
    });

    it('should handle null user agent', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ ...tokenRow, user_agent: null }],
      });

      const result = await repo.create({
        userId: 'user-1',
        sessionId: 'session-1',
        tokenHash: 'abc123hash',
        expiryDate: new Date(expiry),
        userAgent: null,
      });

      expect(result.userAgent).toBeNull();
    });
  });

  describe('findByTokenHash', () => {
    it('should return token when found', async () => {
      mockQuery.mockResolvedValue({ rows: [tokenRow] });

      const result = await repo.findByTokenHash('abc123hash');

      expect(result).not.toBeNull();
      expect(result!.tokenHash).toBe('abc123hash');
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repo.findByTokenHash('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('deleteByTokenHash', () => {
    it('should return true when deleted', async () => {
      mockQuery.mockResolvedValue({ rowCount: 1 });

      const result = await repo.deleteByTokenHash('abc123hash');

      expect(result).toBe(true);
    });

    it('should return false when not found', async () => {
      mockQuery.mockResolvedValue({ rowCount: 0 });

      const result = await repo.deleteByTokenHash('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('deleteBySessionId', () => {
    it('should delete all tokens for a session', async () => {
      mockQuery.mockResolvedValue({ rowCount: 2 });

      await repo.deleteBySessionId('session-1');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM token_information WHERE session_id'),
        ['session-1']
      );
    });
  });

  describe('deleteByUserId', () => {
    it('should delete all tokens for a user', async () => {
      mockQuery.mockResolvedValue({ rowCount: 3 });

      await repo.deleteByUserId('user-1');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM token_information WHERE user_id'),
        ['user-1']
      );
    });
  });

  describe('deleteExpired', () => {
    it('should return count of deleted rows', async () => {
      mockQuery.mockResolvedValue({ rowCount: 5 });

      const result = await repo.deleteExpired();

      expect(result).toBe(5);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM token_information WHERE expiry_date < NOW()')
      );
    });

    it('should return 0 when no expired tokens', async () => {
      mockQuery.mockResolvedValue({ rowCount: 0 });

      const result = await repo.deleteExpired();

      expect(result).toBe(0);
    });
  });
});
