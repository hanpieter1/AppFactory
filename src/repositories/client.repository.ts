// Repository layer for Client entity — direct SQL via pg pool
import { pool } from '../config/database';
import { Client, CreateClientDto, UpdateClientDto, ClientFilters } from '../models/client.model';

interface ClientRow {
  id: string;
  name: string;
  code: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

function mapRow(row: ClientRow): Client {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    active: row.active,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export class ClientRepository {
  async findAll(filters?: ClientFilters): Promise<Client[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (filters?.active !== undefined) {
      conditions.push(`active = $${paramIndex++}`);
      values.push(filters.active);
    }

    if (filters?.search) {
      conditions.push(`(LOWER(name) LIKE $${paramIndex} OR LOWER(code) LIKE $${paramIndex})`);
      values.push(`%${filters.search.toLowerCase()}%`);
      paramIndex++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query<ClientRow>(
      `SELECT id, name, code, active, created_at, updated_at
       FROM clients ${where}
       ORDER BY code`,
      values
    );
    return result.rows.map(mapRow);
  }

  async findById(id: string): Promise<Client | null> {
    const result = await pool.query<ClientRow>(
      'SELECT id, name, code, active, created_at, updated_at FROM clients WHERE id = $1',
      [id]
    );
    return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
  }

  async findByCode(code: string): Promise<Client | null> {
    const result = await pool.query<ClientRow>(
      'SELECT id, name, code, active, created_at, updated_at FROM clients WHERE LOWER(code) = LOWER($1)',
      [code]
    );
    return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
  }

  async create(dto: CreateClientDto): Promise<Client> {
    const result = await pool.query<ClientRow>(
      `INSERT INTO clients (name, code, active)
       VALUES ($1, $2, $3)
       RETURNING id, name, code, active, created_at, updated_at`,
      [dto.name, dto.code, dto.active ?? true]
    );
    return mapRow(result.rows[0]);
  }

  async update(id: string, dto: UpdateClientDto): Promise<Client | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (dto.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(dto.name);
    }
    if (dto.code !== undefined) {
      fields.push(`code = $${paramIndex++}`);
      values.push(dto.code);
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

    const result = await pool.query<ClientRow>(
      `UPDATE clients SET ${fields.join(', ')} WHERE id = $${paramIndex}
       RETURNING id, name, code, active, created_at, updated_at`,
      values
    );
    return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM clients WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
}

export const clientRepository = new ClientRepository();
