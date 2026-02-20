// Repository layer for Department entity — direct SQL via pg pool
import { pool } from '../config/database';
import {
  Department,
  DepartmentWithTeamCount,
  CreateDepartmentDto,
  UpdateDepartmentDto,
  DepartmentFilters,
} from '../models/department.model';

interface DepartmentRow {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface DepartmentWithCountsRow extends DepartmentRow {
  team_count: string;
  member_count: string;
}

function mapRow(row: DepartmentRow): Department {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    active: row.active,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapRowWithCounts(row: DepartmentWithCountsRow): DepartmentWithTeamCount {
  return {
    ...mapRow(row),
    teamCount: parseInt(row.team_count, 10),
    memberCount: parseInt(row.member_count, 10),
  };
}

export class DepartmentRepository {
  async findAll(filters?: DepartmentFilters): Promise<DepartmentWithTeamCount[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (filters?.active !== undefined) {
      conditions.push(`d.active = $${paramIndex++}`);
      values.push(filters.active);
    }

    if (filters?.search) {
      conditions.push(`LOWER(d.name) LIKE $${paramIndex}`);
      values.push(`%${filters.search.toLowerCase()}%`);
      paramIndex++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query<DepartmentWithCountsRow>(
      `SELECT d.id, d.name, d.description, d.active, d.created_at, d.updated_at,
              COALESCE(tc.team_count, 0) AS team_count,
              COALESCE(mc.member_count, 0) AS member_count
       FROM departments d
       LEFT JOIN (SELECT department_id, COUNT(*) AS team_count FROM teams GROUP BY department_id) tc ON tc.department_id = d.id
       LEFT JOIN (SELECT department_id, COUNT(*) AS member_count FROM users WHERE department_id IS NOT NULL GROUP BY department_id) mc ON mc.department_id = d.id
       ${where}
       ORDER BY d.name`,
      values
    );
    return result.rows.map(mapRowWithCounts);
  }

  async findById(id: string): Promise<Department | null> {
    const result = await pool.query<DepartmentRow>(
      'SELECT id, name, description, active, created_at, updated_at FROM departments WHERE id = $1',
      [id]
    );
    return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
  }

  async findByName(name: string): Promise<Department | null> {
    const result = await pool.query<DepartmentRow>(
      'SELECT id, name, description, active, created_at, updated_at FROM departments WHERE LOWER(name) = LOWER($1)',
      [name]
    );
    return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
  }

  async create(dto: CreateDepartmentDto): Promise<Department> {
    const result = await pool.query<DepartmentRow>(
      `INSERT INTO departments (name, description, active)
       VALUES ($1, $2, $3)
       RETURNING id, name, description, active, created_at, updated_at`,
      [dto.name, dto.description ?? null, dto.active ?? true]
    );
    return mapRow(result.rows[0]);
  }

  async update(id: string, dto: UpdateDepartmentDto): Promise<Department | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (dto.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(dto.name);
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

    const result = await pool.query<DepartmentRow>(
      `UPDATE departments SET ${fields.join(', ')} WHERE id = $${paramIndex}
       RETURNING id, name, description, active, created_at, updated_at`,
      values
    );
    return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM departments WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async hasTeams(id: string): Promise<boolean> {
    const result = await pool.query('SELECT 1 FROM teams WHERE department_id = $1 LIMIT 1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async hasMembers(id: string): Promise<boolean> {
    const result = await pool.query('SELECT 1 FROM users WHERE department_id = $1 LIMIT 1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
}

export const departmentRepository = new DepartmentRepository();
