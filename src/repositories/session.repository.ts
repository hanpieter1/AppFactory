// Repository layer for Session entity — direct SQL via pg pool
import { pool } from '../config/database';
import { Session } from '../models/auth.model';

interface SessionRow {
  id: string;
  user_id: string;
  csrf_token: string;
  last_active: string;
  created_at: string;
}

const SESSION_COLUMNS = 'id, user_id, csrf_token, last_active, created_at';

function mapRow(row: SessionRow): Session {
  return {
    id: row.id,
    userId: row.user_id,
    csrfToken: row.csrf_token,
    lastActive: new Date(row.last_active),
    createdAt: new Date(row.created_at),
  };
}

export class SessionRepository {
  async create(data: { userId: string; csrfToken: string }): Promise<Session> {
    const result = await pool.query<SessionRow>(
      `INSERT INTO sessions (user_id, csrf_token)
       VALUES ($1, $2)
       RETURNING ${SESSION_COLUMNS}`,
      [data.userId, data.csrfToken]
    );
    return mapRow(result.rows[0]);
  }

  async findById(id: string): Promise<Session | null> {
    const result = await pool.query<SessionRow>(
      `SELECT ${SESSION_COLUMNS} FROM sessions WHERE id = $1`,
      [id]
    );
    return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
  }

  async updateLastActive(id: string): Promise<void> {
    await pool.query('UPDATE sessions SET last_active = NOW() WHERE id = $1', [id]);
  }

  async delete(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM sessions WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async deleteByUserId(userId: string): Promise<void> {
    await pool.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
  }
}

export const sessionRepository = new SessionRepository();
