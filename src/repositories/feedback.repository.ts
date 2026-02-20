// Repository layer for Feedback entity — direct SQL via pg pool
import { pool } from '../config/database';
import { Feedback, FeedbackWithUser, CreateFeedbackDto } from '../models/feedback.model';

interface FeedbackRow {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  created_at: string;
}

interface FeedbackWithUserRow extends FeedbackRow {
  user_name: string;
}

function mapRow(row: FeedbackRow): Feedback {
  return {
    id: row.id,
    userId: row.user_id,
    subject: row.subject,
    message: row.message,
    createdAt: new Date(row.created_at),
  };
}

function mapRowWithUser(row: FeedbackWithUserRow): FeedbackWithUser {
  return {
    ...mapRow(row),
    userName: row.user_name,
  };
}

export class FeedbackRepository {
  async create(userId: string, dto: CreateFeedbackDto): Promise<Feedback> {
    const result = await pool.query<FeedbackRow>(
      `INSERT INTO feedback (user_id, subject, message)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, subject, message, created_at`,
      [userId, dto.subject, dto.message]
    );
    return mapRow(result.rows[0]);
  }

  async findAll(): Promise<FeedbackWithUser[]> {
    const result = await pool.query<FeedbackWithUserRow>(
      `SELECT f.id, f.user_id, f.subject, f.message, f.created_at,
              u.name AS user_name
       FROM feedback f
       JOIN users u ON u.id = f.user_id
       ORDER BY f.created_at DESC`
    );
    return result.rows.map(mapRowWithUser);
  }

  async findById(id: string): Promise<Feedback | null> {
    const result = await pool.query<FeedbackRow>(
      'SELECT id, user_id, subject, message, created_at FROM feedback WHERE id = $1',
      [id]
    );
    return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM feedback WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
}

export const feedbackRepository = new FeedbackRepository();
