// REQ-003: Database service with health check capability
import { pool } from '../config/database';
import { logger } from '../utils/logger';
import { DatabaseError } from '../utils/errors';

export class DatabaseService {
  /**
   * Ping the database to check connectivity
   * REQ-001: Health check includes database status
   */
  async ping(): Promise<boolean> {
    const startTime = Date.now();

    try {
      const result = await pool.query<{ connected: number }>('SELECT 1 as connected');
      const duration = Date.now() - startTime;

      // Verify we got a valid response
      if (!result.rows || result.rows.length === 0) {
        throw new DatabaseError('Database returned no rows');
      }

      logger.debug('Database ping successful', { duration });

      return result.rows[0].connected === 1;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Database ping failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
      });

      // Re-throw DatabaseError as-is, wrap other errors
      if (error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError('Database connection failed');
    }
  }

  /**
   * Get database connection pool status
   */
  getPoolStatus(): {
    total: number;
    idle: number;
    waiting: number;
  } {
    return {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount,
    };
  }

  /**
   * Test database query execution time
   */
  async testQueryPerformance(): Promise<number> {
    const startTime = Date.now();
    await pool.query('SELECT NOW()');
    return Date.now() - startTime;
  }
}

export const databaseService = new DatabaseService();
