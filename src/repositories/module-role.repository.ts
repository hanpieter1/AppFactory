// Repository layer for ModuleRole entity and user_role_module_roles junction — direct SQL via pg pool
import { pool } from '../config/database';
import { ModuleRole, CreateModuleRoleDto, UpdateModuleRoleDto } from '../models/module.model';

interface ModuleRoleRow {
  id: string;
  module_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

function mapRow(row: ModuleRoleRow): ModuleRole {
  return {
    id: row.id,
    moduleId: row.module_id,
    name: row.name,
    description: row.description,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export class ModuleRoleRepository {
  async findById(id: string): Promise<ModuleRole | null> {
    const result = await pool.query<ModuleRoleRow>(
      'SELECT id, module_id, name, description, created_at, updated_at FROM module_roles WHERE id = $1',
      [id]
    );
    return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
  }

  async findByModuleId(moduleId: string): Promise<ModuleRole[]> {
    const result = await pool.query<ModuleRoleRow>(
      'SELECT id, module_id, name, description, created_at, updated_at FROM module_roles WHERE module_id = $1 ORDER BY name',
      [moduleId]
    );
    return result.rows.map(mapRow);
  }

  async findByNameInModule(moduleId: string, name: string): Promise<ModuleRole | null> {
    const result = await pool.query<ModuleRoleRow>(
      'SELECT id, module_id, name, description, created_at, updated_at FROM module_roles WHERE module_id = $1 AND LOWER(name) = LOWER($2)',
      [moduleId, name]
    );
    return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
  }

  async create(moduleId: string, dto: CreateModuleRoleDto): Promise<ModuleRole> {
    const result = await pool.query<ModuleRoleRow>(
      `INSERT INTO module_roles (module_id, name, description)
       VALUES ($1, $2, $3)
       RETURNING id, module_id, name, description, created_at, updated_at`,
      [moduleId, dto.name, dto.description || null]
    );
    return mapRow(result.rows[0]);
  }

  async update(id: string, dto: UpdateModuleRoleDto): Promise<ModuleRole | null> {
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
    const result = await pool.query<ModuleRoleRow>(
      `UPDATE module_roles SET ${fields.join(', ')} WHERE id = $${paramIndex}
       RETURNING id, module_id, name, description, created_at, updated_at`,
      values
    );
    return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM module_roles WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async isModuleRoleMapped(id: string): Promise<boolean> {
    const result = await pool.query(
      'SELECT 1 FROM user_role_module_roles WHERE module_role_id = $1 LIMIT 1',
      [id]
    );
    return result.rows.length > 0;
  }

  // --- Junction: user_role_module_roles ---

  async getModuleRolesForUserRole(roleId: string): Promise<ModuleRole[]> {
    const result = await pool.query<ModuleRoleRow>(
      `SELECT mr.id, mr.module_id, mr.name, mr.description, mr.created_at, mr.updated_at
       FROM user_role_module_roles urmr
       JOIN module_roles mr ON mr.id = urmr.module_role_id
       WHERE urmr.role_id = $1
       ORDER BY mr.name`,
      [roleId]
    );
    return result.rows.map(mapRow);
  }

  async addModuleRoleToUserRole(roleId: string, moduleRoleId: string): Promise<void> {
    await pool.query(
      'INSERT INTO user_role_module_roles (role_id, module_role_id) VALUES ($1, $2)',
      [roleId, moduleRoleId]
    );
  }

  async removeModuleRoleFromUserRole(roleId: string, moduleRoleId: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM user_role_module_roles WHERE role_id = $1 AND module_role_id = $2',
      [roleId, moduleRoleId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async isMappingExists(roleId: string, moduleRoleId: string): Promise<boolean> {
    const result = await pool.query(
      'SELECT 1 FROM user_role_module_roles WHERE role_id = $1 AND module_role_id = $2',
      [roleId, moduleRoleId]
    );
    return result.rows.length > 0;
  }
}

export const moduleRoleRepository = new ModuleRoleRepository();
