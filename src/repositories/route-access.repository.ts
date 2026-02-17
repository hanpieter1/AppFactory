// Repository layer for RouteAccessRule entity — direct SQL via pg pool
import { pool } from '../config/database';
import {
  RouteAccessRule,
  CreateRouteAccessRuleDto,
  UpdateRouteAccessRuleDto,
} from '../models/route-access.model';

interface RouteAccessRuleRow {
  id: string;
  module_role_id: string;
  route: string;
  methods: string[];
  is_wildcard: boolean;
  created_at: string;
  updated_at: string;
}

function mapRow(row: RouteAccessRuleRow): RouteAccessRule {
  return {
    id: row.id,
    moduleRoleId: row.module_role_id,
    route: row.route,
    methods: row.methods,
    isWildcard: row.is_wildcard,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

const COLUMNS = 'id, module_role_id, route, methods, is_wildcard, created_at, updated_at';

export class RouteAccessRepository {
  async findAll(): Promise<RouteAccessRule[]> {
    const result = await pool.query<RouteAccessRuleRow>(
      `SELECT ${COLUMNS} FROM route_access_rules ORDER BY route, module_role_id`
    );
    return result.rows.map(mapRow);
  }

  async findById(id: string): Promise<RouteAccessRule | null> {
    const result = await pool.query<RouteAccessRuleRow>(
      `SELECT ${COLUMNS} FROM route_access_rules WHERE id = $1`,
      [id]
    );
    return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
  }

  async findByModuleRoleId(moduleRoleId: string): Promise<RouteAccessRule[]> {
    const result = await pool.query<RouteAccessRuleRow>(
      `SELECT ${COLUMNS} FROM route_access_rules WHERE module_role_id = $1 ORDER BY route`,
      [moduleRoleId]
    );
    return result.rows.map(mapRow);
  }

  async findByModuleRoleIds(moduleRoleIds: string[]): Promise<RouteAccessRule[]> {
    if (moduleRoleIds.length === 0) return [];
    const result = await pool.query<RouteAccessRuleRow>(
      `SELECT ${COLUMNS} FROM route_access_rules WHERE module_role_id = ANY($1) ORDER BY route`,
      [moduleRoleIds]
    );
    return result.rows.map(mapRow);
  }

  async findByModuleRoleAndRoute(
    moduleRoleId: string,
    route: string
  ): Promise<RouteAccessRule | null> {
    const result = await pool.query<RouteAccessRuleRow>(
      `SELECT ${COLUMNS} FROM route_access_rules WHERE module_role_id = $1 AND route = $2`,
      [moduleRoleId, route]
    );
    return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
  }

  async create(dto: CreateRouteAccessRuleDto): Promise<RouteAccessRule> {
    const result = await pool.query<RouteAccessRuleRow>(
      `INSERT INTO route_access_rules (module_role_id, route, methods, is_wildcard)
       VALUES ($1, $2, $3, $4)
       RETURNING ${COLUMNS}`,
      [dto.moduleRoleId, dto.route, dto.methods, dto.isWildcard ?? false]
    );
    return mapRow(result.rows[0]);
  }

  async update(id: string, dto: UpdateRouteAccessRuleDto): Promise<RouteAccessRule | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (dto.methods !== undefined) {
      fields.push(`methods = $${paramIndex++}`);
      values.push(dto.methods);
    }
    if (dto.isWildcard !== undefined) {
      fields.push(`is_wildcard = $${paramIndex++}`);
      values.push(dto.isWildcard);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const result = await pool.query<RouteAccessRuleRow>(
      `UPDATE route_access_rules SET ${fields.join(', ')} WHERE id = $${paramIndex}
       RETURNING ${COLUMNS}`,
      values
    );
    return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM route_access_rules WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
}

export const routeAccessRepository = new RouteAccessRepository();
