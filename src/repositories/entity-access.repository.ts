// Repository layer for EntityAccessRule entity — direct SQL via pg pool
import { pool } from '../config/database';
import {
  EntityAccessRule,
  FieldAccessLevel,
  CreateEntityAccessRuleDto,
  UpdateEntityAccessRuleDto,
} from '../models/entity-access.model';

interface EntityAccessRuleRow {
  id: string;
  module_role_id: string;
  entity: string;
  can_create: boolean;
  can_read: boolean;
  can_update: boolean;
  can_delete: boolean;
  row_filter: Record<string, unknown> | null;
  field_access: Record<string, FieldAccessLevel> | null;
  created_at: string;
  updated_at: string;
}

function mapRow(row: EntityAccessRuleRow): EntityAccessRule {
  return {
    id: row.id,
    moduleRoleId: row.module_role_id,
    entity: row.entity,
    canCreate: row.can_create,
    canRead: row.can_read,
    canUpdate: row.can_update,
    canDelete: row.can_delete,
    rowFilter: row.row_filter,
    fieldAccess: row.field_access,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

const COLUMNS =
  'id, module_role_id, entity, can_create, can_read, can_update, can_delete, row_filter, field_access, created_at, updated_at';

export class EntityAccessRepository {
  async findAll(): Promise<EntityAccessRule[]> {
    const result = await pool.query<EntityAccessRuleRow>(
      `SELECT ${COLUMNS} FROM entity_access_rules ORDER BY entity, module_role_id`
    );
    return result.rows.map(mapRow);
  }

  async findById(id: string): Promise<EntityAccessRule | null> {
    const result = await pool.query<EntityAccessRuleRow>(
      `SELECT ${COLUMNS} FROM entity_access_rules WHERE id = $1`,
      [id]
    );
    return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
  }

  async findByModuleRoleId(moduleRoleId: string): Promise<EntityAccessRule[]> {
    const result = await pool.query<EntityAccessRuleRow>(
      `SELECT ${COLUMNS} FROM entity_access_rules WHERE module_role_id = $1 ORDER BY entity`,
      [moduleRoleId]
    );
    return result.rows.map(mapRow);
  }

  async findByModuleRoleIds(moduleRoleIds: string[]): Promise<EntityAccessRule[]> {
    if (moduleRoleIds.length === 0) return [];
    const result = await pool.query<EntityAccessRuleRow>(
      `SELECT ${COLUMNS} FROM entity_access_rules WHERE module_role_id = ANY($1) ORDER BY entity`,
      [moduleRoleIds]
    );
    return result.rows.map(mapRow);
  }

  async findByModuleRoleAndEntity(
    moduleRoleId: string,
    entity: string
  ): Promise<EntityAccessRule | null> {
    const result = await pool.query<EntityAccessRuleRow>(
      `SELECT ${COLUMNS} FROM entity_access_rules WHERE module_role_id = $1 AND entity = $2`,
      [moduleRoleId, entity]
    );
    return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
  }

  async create(dto: CreateEntityAccessRuleDto): Promise<EntityAccessRule> {
    const result = await pool.query<EntityAccessRuleRow>(
      `INSERT INTO entity_access_rules (module_role_id, entity, can_create, can_read, can_update, can_delete, row_filter, field_access)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING ${COLUMNS}`,
      [
        dto.moduleRoleId,
        dto.entity,
        dto.canCreate ?? false,
        dto.canRead ?? false,
        dto.canUpdate ?? false,
        dto.canDelete ?? false,
        dto.rowFilter ? JSON.stringify(dto.rowFilter) : null,
        dto.fieldAccess ? JSON.stringify(dto.fieldAccess) : null,
      ]
    );
    return mapRow(result.rows[0]);
  }

  async update(id: string, dto: UpdateEntityAccessRuleDto): Promise<EntityAccessRule | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (dto.canCreate !== undefined) {
      fields.push(`can_create = $${paramIndex++}`);
      values.push(dto.canCreate);
    }
    if (dto.canRead !== undefined) {
      fields.push(`can_read = $${paramIndex++}`);
      values.push(dto.canRead);
    }
    if (dto.canUpdate !== undefined) {
      fields.push(`can_update = $${paramIndex++}`);
      values.push(dto.canUpdate);
    }
    if (dto.canDelete !== undefined) {
      fields.push(`can_delete = $${paramIndex++}`);
      values.push(dto.canDelete);
    }
    if (dto.rowFilter !== undefined) {
      fields.push(`row_filter = $${paramIndex++}`);
      values.push(dto.rowFilter ? JSON.stringify(dto.rowFilter) : null);
    }
    if (dto.fieldAccess !== undefined) {
      fields.push(`field_access = $${paramIndex++}`);
      values.push(dto.fieldAccess ? JSON.stringify(dto.fieldAccess) : null);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const result = await pool.query<EntityAccessRuleRow>(
      `UPDATE entity_access_rules SET ${fields.join(', ')} WHERE id = $${paramIndex}
       RETURNING ${COLUMNS}`,
      values
    );
    return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM entity_access_rules WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
}

export const entityAccessRepository = new EntityAccessRepository();
