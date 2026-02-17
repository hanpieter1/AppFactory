// Simple database migration runner
// Tracks applied migrations in a _migrations table
import * as fs from 'fs';
import * as path from 'path';
import { pool } from '../config/database';
import { logger } from '../utils/logger';

async function ensureMigrationsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations(): Promise<string[]> {
  const result = await pool.query<{ name: string }>('SELECT name FROM _migrations ORDER BY id');
  return result.rows.map((row) => row.name);
}

async function runMigrations(): Promise<void> {
  const migrationsDir = path.join(__dirname, 'migrations');

  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  let migrationsRun = 0;

  for (const file of files) {
    if (applied.includes(file)) {
      logger.info(`Skipping already applied migration: ${file}`);
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      logger.info(`Applied migration: ${file}`);
      migrationsRun++;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`Failed to apply migration: ${file}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      client.release();
    }
  }

  if (migrationsRun === 0) {
    logger.info('No new migrations to apply');
  } else {
    logger.info(`Applied ${migrationsRun} migration(s)`);
  }
}

async function runSeeds(): Promise<void> {
  const seedsDir = path.join(__dirname, 'seeds');

  const files = fs
    .readdirSync(seedsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(seedsDir, file), 'utf-8');

    try {
      await pool.query(sql);
      logger.info(`Applied seed: ${file}`);
    } catch (error) {
      logger.error(`Failed to apply seed: ${file}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

// CLI entry point
const command = process.argv[2];

async function main(): Promise<void> {
  try {
    if (command === 'seed') {
      await runSeeds();
    } else {
      await runMigrations();
      if (command === 'migrate:seed') {
        await runSeeds();
      }
    }
  } catch (error) {
    logger.error('Database operation failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  } finally {
    await pool.end();
  }
}

void main();
