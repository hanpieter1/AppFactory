// Repository layer for UserRole entity — direct SQL via pg pool
import { pool } from '../config/database';
import {
  UserRole,
  UserRoleWithGrantable,
  CreateRoleDto,
  UpdateRoleDto,
} from '../models/role.model';

interface UserRoleRow {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

function mapRow(row: UserRoleRow): UserRole {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export class RoleRepository {
  async findAll(): Promise<UserRole[]> {
    const result = await pool.query<UserRoleRow>(
      'SELECT id, name, description, created_at, updated_at FROM user_roles ORDER BY name'
    );
    return result.rows.map(mapRow);
  }

  async findById(id: string): Promise<UserRole | null> {
    const result = await pool.query<UserRoleRow>(
      'SELECT id, name, description, created_at, updated_at FROM user_roles WHERE id = $1',
      [id]
    );
    return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
  }

  async findByIdWithGrantable(id: string): Promise<UserRoleWithGrantable | null> {
    const roleResult = await pool.query<UserRoleRow>(
      'SELECT id, name, description, created_at, updated_at FROM user_roles WHERE id = $1',
      [id]
    );

    if (roleResult.rows.length === 0) return null;

    const grantableResult = await pool.query<UserRoleRow>(
      `SELECT ur.id, ur.name, ur.description, ur.created_at, ur.updated_at
       FROM user_role_grantable_roles urg
       JOIN user_roles ur ON ur.id = urg.grantable_role_id
       WHERE urg.role_id = $1
       ORDER BY ur.name`,
      [id]
    );

    return {
      ...mapRow(roleResult.rows[0]),
      grantableRoles: grantableResult.rows.map(mapRow),
    };
  }

  async findByName(name: string): Promise<UserRole | null> {
    const result = await pool.query<UserRoleRow>(
      'SELECT id, name, description, created_at, updated_at FROM user_roles WHERE LOWER(name) = LOWER($1)',
      [name]
    );
    return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
  }

  async create(dto: CreateRoleDto): Promise<UserRole> {
    const result = await pool.query<UserRoleRow>(
      `INSERT INTO user_roles (name, description)
       VALUES ($1, $2)
       RETURNING id, name, description, created_at, updated_at`,
      [dto.name, dto.description || null]
    );
    return mapRow(result.rows[0]);
  }

  async update(id: string, dto: UpdateRoleDto): Promise<UserRole | null> {
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
    const result = await pool.query<UserRoleRow>(
      `UPDATE user_roles SET ${fields.join(', ')} WHERE id = $${paramIndex}
       RETURNING id, name, description, created_at, updated_at`,
      values
    );
    return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM user_roles WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async isRoleAssignedToUsers(id: string): Promise<boolean> {
    const result = await pool.query('SELECT 1 FROM user_user_roles WHERE role_id = $1 LIMIT 1', [
      id,
    ]);
    return result.rows.length > 0;
  }

  async isRoleReferencedAsGrantable(id: string): Promise<boolean> {
    const result = await pool.query(
      'SELECT 1 FROM user_role_grantable_roles WHERE grantable_role_id = $1 LIMIT 1',
      [id]
    );
    return result.rows.length > 0;
  }

  async getGrantableRoles(roleId: string): Promise<UserRole[]> {
    const result = await pool.query<UserRoleRow>(
      `SELECT ur.id, ur.name, ur.description, ur.created_at, ur.updated_at
       FROM user_role_grantable_roles urg
       JOIN user_roles ur ON ur.id = urg.grantable_role_id
       WHERE urg.role_id = $1
       ORDER BY ur.name`,
      [roleId]
    );
    return result.rows.map(mapRow);
  }

  async getGrantableRoleIdsForRoles(roleIds: string[]): Promise<string[]> {
    if (roleIds.length === 0) return [];

    const placeholders = roleIds.map((_, i) => `$${i + 1}`).join(', ');
    const result = await pool.query<{ grantable_role_id: string }>(
      `SELECT DISTINCT grantable_role_id
       FROM user_role_grantable_roles
       WHERE role_id IN (${placeholders})`,
      roleIds
    );
    return result.rows.map((row) => row.grantable_role_id);
  }

  async setGrantableRoles(roleId: string, grantableRoleIds: string[]): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM user_role_grantable_roles WHERE role_id = $1', [roleId]);

      for (const grantableId of grantableRoleIds) {
        await client.query(
          'INSERT INTO user_role_grantable_roles (role_id, grantable_role_id) VALUES ($1, $2)',
          [roleId, grantableId]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export const roleRepository = new RoleRepository();
