// Repository layer for TokenInformation entity — direct SQL via pg pool
import { pool } from '../config/database';
import { TokenInformation } from '../models/auth.model';

interface TokenRow {
  id: string;
  user_id: string;
  session_id: string;
  token_hash: string;
  expiry_date: string;
  user_agent: string | null;
  created_at: string;
}

const TOKEN_COLUMNS = 'id, user_id, session_id, token_hash, expiry_date, user_agent, created_at';

function mapRow(row: TokenRow): TokenInformation {
  return {
    id: row.id,
    userId: row.user_id,
    sessionId: row.session_id,
    tokenHash: row.token_hash,
    expiryDate: new Date(row.expiry_date),
    userAgent: row.user_agent,
    createdAt: new Date(row.created_at),
  };
}

export class TokenRepository {
  async create(data: {
    userId: string;
    sessionId: string;
    tokenHash: string;
    expiryDate: Date;
    userAgent: string | null;
  }): Promise<TokenInformation> {
    const result = await pool.query<TokenRow>(
      `INSERT INTO token_information (user_id, session_id, token_hash, expiry_date, user_agent)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${TOKEN_COLUMNS}`,
      [data.userId, data.sessionId, data.tokenHash, data.expiryDate, data.userAgent]
    );
    return mapRow(result.rows[0]);
  }

  async findByTokenHash(tokenHash: string): Promise<TokenInformation | null> {
    const result = await pool.query<TokenRow>(
      `SELECT ${TOKEN_COLUMNS} FROM token_information WHERE token_hash = $1`,
      [tokenHash]
    );
    return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
  }

  async deleteByTokenHash(tokenHash: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM token_information WHERE token_hash = $1', [
      tokenHash,
    ]);
    return (result.rowCount ?? 0) > 0;
  }

  async deleteBySessionId(sessionId: string): Promise<void> {
    await pool.query('DELETE FROM token_information WHERE session_id = $1', [sessionId]);
  }

  async deleteByUserId(userId: string): Promise<void> {
    await pool.query('DELETE FROM token_information WHERE user_id = $1', [userId]);
  }

  async deleteExpired(): Promise<number> {
    const result = await pool.query('DELETE FROM token_information WHERE expiry_date < NOW()');
    return result.rowCount ?? 0;
  }
}

export const tokenRepository = new TokenRepository();
