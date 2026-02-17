// Repository layer for User/Account entity — direct SQL via pg pool
import { pool } from '../config/database';
import {
  User,
  UserWithRoles,
  UpdateUserDto,
  UserType,
  UserListQuery,
  PaginatedResult,
} from '../models/user.model';
import { UserRole } from '../models/role.model';

interface UserRow {
  id: string;
  name: string;
  full_name: string | null;
  email: string | null;
  active: boolean;
  blocked: boolean;
  blocked_since: string | null;
  failed_logins: number;
  last_login: string | null;
  web_service_user: boolean;
  is_anonymous: boolean;
  is_local_user: boolean;
  user_type: string;
  created_at: string;
  updated_at: string;
}

interface RoleRow {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

// Columns selected in all non-password queries (never includes password)
const USER_COLUMNS = `id, name, full_name, email, active, blocked, blocked_since,
  failed_logins, last_login, web_service_user, is_anonymous, is_local_user,
  user_type, created_at, updated_at`;

// Aliased version for queries that use table alias 'u' (e.g. findAll with JOINs)
const USER_COLUMNS_ALIASED = USER_COLUMNS.split(',')
  .map((c) => `u.${c.trim()}`)
  .join(', ');

const SORT_COLUMN_MAP: Record<string, string> = {
  fullName: 'u.full_name',
  name: 'u.name',
  lastLogin: 'u.last_login',
  active: 'u.active',
};

function mapRow(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    fullName: row.full_name,
    email: row.email,
    active: row.active,
    blocked: row.blocked,
    blockedSince: row.blocked_since ? new Date(row.blocked_since) : null,
    failedLogins: row.failed_logins,
    lastLogin: row.last_login ? new Date(row.last_login) : null,
    webServiceUser: row.web_service_user,
    isAnonymous: row.is_anonymous,
    isLocalUser: row.is_local_user,
    userType: row.user_type as UserType,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapRoleRow(row: RoleRow): UserRole {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export class UserRepository {
  async findAll(query?: UserListQuery): Promise<PaginatedResult<User>> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;
    let needsRoleJoin = false;

    if (query?.active !== undefined) {
      conditions.push(`u.active = $${paramIndex++}`);
      values.push(query.active);
    }
    if (query?.webServiceUser !== undefined) {
      conditions.push(`u.web_service_user = $${paramIndex++}`);
      values.push(query.webServiceUser);
    }
    if (query?.isLocalUser !== undefined) {
      conditions.push(`u.is_local_user = $${paramIndex++}`);
      values.push(query.isLocalUser);
    }
    if (query?.role !== undefined) {
      needsRoleJoin = true;
      conditions.push(`LOWER(ur.name) = LOWER($${paramIndex++})`);
      values.push(query.role);
    }
    if (query?.search !== undefined && query.search.trim().length > 0) {
      conditions.push(`(u.name ILIKE $${paramIndex} OR u.full_name ILIKE $${paramIndex})`);
      values.push(`%${query.search}%`);
      paramIndex++;
    }

    let fromClause = 'FROM users u';
    if (needsRoleJoin) {
      fromClause += `
        JOIN user_user_roles uur ON uur.user_id = u.id
        JOIN user_roles ur ON ur.id = uur.role_id`;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sortColumn = query?.sortBy ? SORT_COLUMN_MAP[query.sortBy] || 'u.name' : 'u.name';
    const sortOrder = query?.order === 'desc' ? 'DESC' : 'ASC';
    const nullsClause =
      sortColumn === 'u.full_name' || sortColumn === 'u.last_login'
        ? sortOrder === 'ASC'
          ? 'NULLS LAST'
          : 'NULLS FIRST'
        : '';
    const orderBy = `ORDER BY ${sortColumn} ${sortOrder} ${nullsClause}`.trim();

    const page = Math.max(1, query?.page ?? 1);
    const limit = Math.min(100, Math.max(1, query?.limit ?? 20));
    const offset = (page - 1) * limit;

    // Count query
    const countResult = await pool.query<{ total: string }>(
      `SELECT COUNT(DISTINCT u.id) AS total ${fromClause} ${where}`,
      values
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Data query
    const dataResult = await pool.query<UserRow>(
      `SELECT DISTINCT ${USER_COLUMNS_ALIASED} ${fromClause} ${where} ${orderBy} LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...values, limit, offset]
    );

    return {
      data: dataResult.rows.map(mapRow),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
      },
    };
  }

  async findById(id: string): Promise<User | null> {
    const result = await pool.query<UserRow>(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [
      id,
    ]);
    return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
  }

  async findByIdWithRoles(id: string): Promise<UserWithRoles | null> {
    const userResult = await pool.query<UserRow>(
      `SELECT ${USER_COLUMNS} FROM users WHERE id = $1`,
      [id]
    );

    if (userResult.rows.length === 0) return null;

    const rolesResult = await pool.query<RoleRow>(
      `SELECT ur.id, ur.name, ur.description, ur.created_at, ur.updated_at
       FROM user_user_roles uur
       JOIN user_roles ur ON ur.id = uur.role_id
       WHERE uur.user_id = $1
       ORDER BY ur.name`,
      [id]
    );

    return {
      ...mapRow(userResult.rows[0]),
      roles: rolesResult.rows.map(mapRoleRow),
    };
  }

  async findByName(name: string): Promise<User | null> {
    const result = await pool.query<UserRow>(
      `SELECT ${USER_COLUMNS} FROM users WHERE LOWER(name) = LOWER($1)`,
      [name]
    );
    return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
  }

  async findPasswordHashById(id: string): Promise<string | null> {
    const result = await pool.query<{ password: string }>(
      'SELECT password FROM users WHERE id = $1',
      [id]
    );
    return result.rows.length > 0 ? result.rows[0].password : null;
  }

  async create(data: {
    name: string;
    password: string;
    fullName?: string;
    email?: string;
    webServiceUser: boolean;
    isLocalUser: boolean;
    userType: UserType;
  }): Promise<User> {
    const result = await pool.query<UserRow>(
      `INSERT INTO users (name, password, full_name, email, web_service_user, is_local_user, user_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING ${USER_COLUMNS}`,
      [
        data.name,
        data.password,
        data.fullName || null,
        data.email || null,
        data.webServiceUser,
        data.isLocalUser,
        data.userType,
      ]
    );
    return mapRow(result.rows[0]);
  }

  async update(id: string, dto: UpdateUserDto): Promise<User | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (dto.fullName !== undefined) {
      fields.push(`full_name = $${paramIndex++}`);
      values.push(dto.fullName);
    }
    if (dto.email !== undefined) {
      fields.push(`email = $${paramIndex++}`);
      values.push(dto.email);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const result = await pool.query<UserRow>(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex}
       RETURNING ${USER_COLUMNS}`,
      values
    );
    return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
  }

  async updatePassword(id: string, hashedPassword: string): Promise<boolean> {
    const result = await pool.query('UPDATE users SET password = $1 WHERE id = $2', [
      hashedPassword,
      id,
    ]);
    return (result.rowCount ?? 0) > 0;
  }

  async updateStatus(
    id: string,
    status: {
      active?: boolean;
      blocked?: boolean;
      blockedSince?: Date | null;
      failedLogins?: number;
    }
  ): Promise<User | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (status.active !== undefined) {
      fields.push(`active = $${paramIndex++}`);
      values.push(status.active);
    }
    if (status.blocked !== undefined) {
      fields.push(`blocked = $${paramIndex++}`);
      values.push(status.blocked);
    }
    if (status.blockedSince !== undefined) {
      fields.push(`blocked_since = $${paramIndex++}`);
      values.push(status.blockedSince);
    }
    if (status.failedLogins !== undefined) {
      fields.push(`failed_logins = $${paramIndex++}`);
      values.push(status.failedLogins);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const result = await pool.query<UserRow>(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex}
       RETURNING ${USER_COLUMNS}`,
      values
    );
    return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
  }

  async updateLastLogin(id: string): Promise<void> {
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [id]);
  }

  async delete(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async getUserRoles(userId: string): Promise<UserRole[]> {
    const result = await pool.query<RoleRow>(
      `SELECT ur.id, ur.name, ur.description, ur.created_at, ur.updated_at
       FROM user_user_roles uur
       JOIN user_roles ur ON ur.id = uur.role_id
       WHERE uur.user_id = $1
       ORDER BY ur.name`,
      [userId]
    );
    return result.rows.map(mapRoleRow);
  }

  async setUserRoles(userId: string, roleIds: string[]): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM user_user_roles WHERE user_id = $1', [userId]);

      for (const roleId of roleIds) {
        await client.query('INSERT INTO user_user_roles (user_id, role_id) VALUES ($1, $2)', [
          userId,
          roleId,
        ]);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async isRoleAssignedToAnyUser(roleId: string): Promise<boolean> {
    const result = await pool.query('SELECT 1 FROM user_user_roles WHERE role_id = $1 LIMIT 1', [
      roleId,
    ]);
    return result.rows.length > 0;
  }
}

export const userRepository = new UserRepository();
