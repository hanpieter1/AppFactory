// REQ-003: Database Integration with connection pooling
import { Pool, PoolConfig, types } from 'pg';
import { logger } from '../utils/logger';

// Return DATE columns as 'YYYY-MM-DD' strings instead of JavaScript Date objects.
// This avoids timezone-related shifts when serializing to JSON (e.g. CET date
// "2026-02-09" becoming "2026-02-08T23:00:00.000Z" in UTC).
types.setTypeParser(1082, (val: string) => val);

const poolConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5434', 10),
  database: process.env.DB_NAME || 'appfactory',
  user: process.env.DB_USER || 'appfactory',
  password: process.env.DB_PASSWORD || 'appfactory',
  max: parseInt(process.env.DB_POOL_MAX || '20', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  // SSL config: DB_SSL=true enables SSL, DB_SSL_REJECT_UNAUTHORIZED=false disables cert verification
  // nosemgrep: problem-based-packs.insecure-transport.js-node.bypass-tls-verification
  ssl:
    process.env.DB_SSL === 'true'
      ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
      : false,
};

// Alternative: Use DATABASE_URL if provided
if (process.env.DATABASE_URL) {
  const dbUrl = new URL(process.env.DATABASE_URL);
  poolConfig.host = dbUrl.hostname;
  poolConfig.port = parseInt(dbUrl.port || '5432', 10);
  poolConfig.database = dbUrl.pathname.slice(1);
  poolConfig.user = dbUrl.username;
  poolConfig.password = dbUrl.password;
}

export const pool = new Pool(poolConfig);

// Log pool errors
pool.on('error', (err) => {
  logger.error('Unexpected database pool error', { error: err.message });
});

// Log when pool is connected
pool.on('connect', () => {
  logger.debug('New database client connected to pool');
});

// Graceful shutdown
export async function closePool(): Promise<void> {
  logger.info('Closing database connection pool');
  await pool.end();
}
