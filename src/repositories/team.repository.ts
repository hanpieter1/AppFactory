// Repository layer for Team entity — direct SQL via pg pool
import { pool } from '../config/database';
import {
  Team,
  TeamWithDetails,
  CreateTeamDto,
  UpdateTeamDto,
  TeamFilters,
} from '../models/team.model';

interface TeamRow {
  id: string;
  name: string;
  department_id: string;
  description: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface TeamWithDetailsRow extends TeamRow {
  department_name: string;
  member_count: string;
}

function mapRow(row: TeamRow): Team {
  return {
    id: row.id,
    name: row.name,
    departmentId: row.department_id,
    description: row.description,
    active: row.active,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapRowWithDetails(row: TeamWithDetailsRow): TeamWithDetails {
  return {
    ...mapRow(row),
    departmentName: row.department_name,
    memberCount: parseInt(row.member_count, 10),
  };
}

export class TeamRepository {
  async findAll(filters?: TeamFilters): Promise<TeamWithDetails[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (filters?.departmentId) {
      conditions.push(`t.department_id = $${paramIndex++}`);
      values.push(filters.departmentId);
    }

    if (filters?.active !== undefined) {
      conditions.push(`t.active = $${paramIndex++}`);
      values.push(filters.active);
    }

    if (filters?.search) {
      conditions.push(`LOWER(t.name) LIKE $${paramIndex}`);
      values.push(`%${filters.search.toLowerCase()}%`);
      paramIndex++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query<TeamWithDetailsRow>(
      `SELECT t.id, t.name, t.department_id, t.description, t.active, t.created_at, t.updated_at,
              d.name AS department_name,
              COALESCE(mc.member_count, 0) AS member_count
       FROM teams t
       JOIN departments d ON d.id = t.department_id
       LEFT JOIN (SELECT team_id, COUNT(*) AS member_count FROM users WHERE team_id IS NOT NULL GROUP BY team_id) mc ON mc.team_id = t.id
       ${where}
       ORDER BY d.name, t.name`,
      values
    );
    return result.rows.map(mapRowWithDetails);
  }

  async findById(id: string): Promise<Team | null> {
    const result = await pool.query<TeamRow>(
      'SELECT id, name, department_id, description, active, created_at, updated_at FROM teams WHERE id = $1',
      [id]
    );
    return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
  }

  async findByNameInDepartment(name: string, departmentId: string): Promise<Team | null> {
    const result = await pool.query<TeamRow>(
      `SELECT id, name, department_id, description, active, created_at, updated_at
       FROM teams WHERE LOWER(name) = LOWER($1) AND department_id = $2`,
      [name, departmentId]
    );
    return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
  }

  async create(dto: CreateTeamDto): Promise<Team> {
    const result = await pool.query<TeamRow>(
      `INSERT INTO teams (name, department_id, description, active)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, department_id, description, active, created_at, updated_at`,
      [dto.name, dto.departmentId, dto.description ?? null, dto.active ?? true]
    );
    return mapRow(result.rows[0]);
  }

  async update(id: string, dto: UpdateTeamDto): Promise<Team | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (dto.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(dto.name);
    }
    if (dto.departmentId !== undefined) {
      fields.push(`department_id = $${paramIndex++}`);
      values.push(dto.departmentId);
    }
    if (dto.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(dto.description);
    }
    if (dto.active !== undefined) {
      fields.push(`active = $${paramIndex++}`);
      values.push(dto.active);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query<TeamRow>(
      `UPDATE teams SET ${fields.join(', ')} WHERE id = $${paramIndex}
       RETURNING id, name, department_id, description, active, created_at, updated_at`,
      values
    );
    return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM teams WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async hasMembers(id: string): Promise<boolean> {
    const result = await pool.query('SELECT 1 FROM users WHERE team_id = $1 LIMIT 1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async getTeamMembers(id: string): Promise<{ id: string; name: string; fullName: string | null }[]> {
    const result = await pool.query<{ id: string; name: string; full_name: string | null }>(
      'SELECT id, name, full_name FROM users WHERE team_id = $1 ORDER BY full_name, name',
      [id]
    );
    return result.rows.map((r) => ({ id: r.id, name: r.name, fullName: r.full_name }));
  }
}

export const teamRepository = new TeamRepository();
