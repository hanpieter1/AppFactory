// Unit tests for DatabaseService
import { DatabaseService } from '../../src/services/database.service';
import { pool } from '../../src/config/database';
import { DatabaseError } from '../../src/utils/errors';

// Mock the pool
jest.mock('../../src/config/database', () => ({
  pool: {
    query: jest.fn(),
    totalCount: 10,
    idleCount: 8,
    waitingCount: 0,
  },
}));

describe('DatabaseService', () => {
  let service: DatabaseService;

  beforeEach(() => {
    service = new DatabaseService();
    jest.clearAllMocks();
  });

  describe('ping', () => {
    it('should return true when database is reachable', async () => {
      const mockQuery = pool.query as jest.Mock;
      mockQuery.mockResolvedValue({
        rows: [{ connected: 1 }],
      });

      const result = await service.ping();

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith('SELECT 1 as connected');
    });

    it('should throw DatabaseError when database is unreachable', async () => {
      const mockQuery = pool.query as jest.Mock;
      mockQuery.mockRejectedValue(new Error('Connection refused'));

      await expect(service.ping()).rejects.toThrow(DatabaseError);
      await expect(service.ping()).rejects.toThrow('Database connection failed');
    });

    it('should return false when query returns no rows', async () => {
      const mockQuery = pool.query as jest.Mock;
      mockQuery.mockResolvedValue({
        rows: [],
      });

      await expect(service.ping()).rejects.toThrow(DatabaseError);
    });
  });

  describe('getPoolStatus', () => {
    it('should return connection pool status', () => {
      const status = service.getPoolStatus();

      expect(status).toEqual({
        total: 10,
        idle: 8,
        waiting: 0,
      });
    });
  });

  describe('testQueryPerformance', () => {
    it('should measure query execution time', async () => {
      const mockQuery = pool.query as jest.Mock;
      mockQuery.mockResolvedValue({
        rows: [{ now: new Date() }],
      });

      const duration = await service.testQueryPerformance();

      expect(duration).toBeGreaterThanOrEqual(0);
      expect(mockQuery).toHaveBeenCalledWith('SELECT NOW()');
    });
  });
});
