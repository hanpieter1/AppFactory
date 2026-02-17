// Repository layer for Module entity — direct SQL via pg pool
import { pool } from '../config/database';
import { Module, CreateModuleDto, UpdateModuleDto } from '../models/module.model';

interface ModuleRow {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

function mapRow(row: ModuleRow): Module {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export class ModuleRepository {
  async findAll(): Promise<Module[]> {
    const result = await pool.query<ModuleRow>(
      'SELECT id, name, description, created_at, updated_at FROM modules ORDER BY name'
    );
    return result.rows.map(mapRow);
  }

  async findById(id: string): Promise<Module | null> {
    const result = await pool.query<ModuleRow>(
      'SELECT id, name, description, created_at, updated_at FROM modules WHERE id = $1',
      [id]
    );
    return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
  }

  async findByName(name: string): Promise<Module | null> {
    const result = await pool.query<ModuleRow>(
      'SELECT id, name, description, created_at, updated_at FROM modules WHERE LOWER(name) = LOWER($1)',
      [name]
    );
    return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
  }

  async create(dto: CreateModuleDto): Promise<Module> {
    const result = await pool.query<ModuleRow>(
      `INSERT INTO modules (name, description)
       VALUES ($1, $2)
       RETURNING id, name, description, created_at, updated_at`,
      [dto.name, dto.description || null]
    );
    return mapRow(result.rows[0]);
  }

  async update(id: string, dto: UpdateModuleDto): Promise<Module | null> {
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

    values.push(id);
    const result = await pool.query<ModuleRow>(
      `UPDATE modules SET ${fields.join(', ')} WHERE id = $${paramIndex}
       RETURNING id, name, description, created_at, updated_at`,
      values
    );
    return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM modules WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async hasModuleRoles(id: string): Promise<boolean> {
    const result = await pool.query('SELECT 1 FROM module_roles WHERE module_id = $1 LIMIT 1', [
      id,
    ]);
    return result.rows.length > 0;
  }
}

export const moduleRepository = new ModuleRepository();
