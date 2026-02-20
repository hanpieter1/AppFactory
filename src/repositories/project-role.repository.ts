// Repository layer for ProjectRole entity — direct SQL via pg pool
import { pool } from '../config/database';
import { ProjectRole, CreateProjectRoleDto, UpdateProjectRoleDto } from '../models/project-role.model';

interface ProjectRoleRow {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

function mapRow(row: ProjectRoleRow): ProjectRole {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export class ProjectRoleRepository {
  async findAll(): Promise<ProjectRole[]> {
    const result = await pool.query<ProjectRoleRow>(
      'SELECT id, name, description, created_at, updated_at FROM project_roles ORDER BY name'
    );
    return result.rows.map(mapRow);
  }

  async findById(id: string): Promise<ProjectRole | null> {
    const result = await pool.query<ProjectRoleRow>(
      'SELECT id, name, description, created_at, updated_at FROM project_roles WHERE id = $1',
      [id]
    );
    return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
  }

  async findByName(name: string): Promise<ProjectRole | null> {
    const result = await pool.query<ProjectRoleRow>(
      'SELECT id, name, description, created_at, updated_at FROM project_roles WHERE LOWER(name) = LOWER($1)',
      [name]
    );
    return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
  }

  async create(dto: CreateProjectRoleDto): Promise<ProjectRole> {
    const result = await pool.query<ProjectRoleRow>(
      `INSERT INTO project_roles (name, description)
       VALUES ($1, $2)
       RETURNING id, name, description, created_at, updated_at`,
      [dto.name, dto.description ?? null]
    );
    return mapRow(result.rows[0]);
  }

  async update(id: string, dto: UpdateProjectRoleDto): Promise<ProjectRole | null> {
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

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query<ProjectRoleRow>(
      `UPDATE project_roles SET ${fields.join(', ')} WHERE id = $${paramIndex}
       RETURNING id, name, description, created_at, updated_at`,
      values
    );
    return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM project_roles WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
}

export const projectRoleRepository = new ProjectRoleRepository();
