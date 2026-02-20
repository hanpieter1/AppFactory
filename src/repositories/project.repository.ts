// Repository layer for Project entity — direct SQL via pg pool
import { pool } from '../config/database';
import {
  Project,
  ProjectWithDetails,
  CreateProjectDto,
  UpdateProjectDto,
  ProjectFilters,
} from '../models/project.model';

const PROJECT_COLUMNS = `id, name, department_id, team_id, master_project_id,
  status, domain, process, app_size, complexity, alert_level, governance_status,
  governance_template, infrastructure_template, operations_template,
  start_date, go_live_date, reference_number, description,
  created_at, updated_at`;

interface ProjectRow {
  id: string;
  name: string;
  department_id: string | null;
  team_id: string | null;
  master_project_id: string | null;
  status: string;
  domain: string | null;
  process: string | null;
  app_size: string | null;
  complexity: string | null;
  alert_level: string | null;
  governance_status: string | null;
  governance_template: string | null;
  infrastructure_template: string | null;
  operations_template: string | null;
  start_date: string | null;
  go_live_date: string | null;
  reference_number: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface ProjectWithDetailsRow extends ProjectRow {
  department_name: string | null;
  team_name: string | null;
  master_project_name: string | null;
}

function mapRow(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    departmentId: row.department_id,
    teamId: row.team_id,
    masterProjectId: row.master_project_id,
    status: row.status as Project['status'],
    domain: row.domain as Project['domain'],
    process: row.process as Project['process'],
    appSize: row.app_size as Project['appSize'],
    complexity: row.complexity as Project['complexity'],
    alertLevel: row.alert_level as Project['alertLevel'],
    governanceStatus: row.governance_status as Project['governanceStatus'],
    governanceTemplate: row.governance_template,
    infrastructureTemplate: row.infrastructure_template,
    operationsTemplate: row.operations_template,
    startDate: row.start_date,
    goLiveDate: row.go_live_date,
    referenceNumber: row.reference_number,
    description: row.description,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapRowWithDetails(row: ProjectWithDetailsRow): ProjectWithDetails {
  return {
    ...mapRow(row),
    departmentName: row.department_name,
    teamName: row.team_name,
    masterProjectName: row.master_project_name,
  };
}

export class ProjectRepository {
  async findAll(filters?: ProjectFilters): Promise<ProjectWithDetails[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (filters?.search) {
      conditions.push(
        `(LOWER(p.name) LIKE $${paramIndex} OR LOWER(d.name) LIKE $${paramIndex} OR LOWER(t.name) LIKE $${paramIndex})`
      );
      values.push(`%${filters.search.toLowerCase()}%`);
      paramIndex++;
    }

    if (filters?.status) {
      conditions.push(`p.status = $${paramIndex++}`);
      values.push(filters.status);
    }

    if (filters?.departmentId) {
      conditions.push(`p.department_id = $${paramIndex++}`);
      values.push(filters.departmentId);
    }

    if (filters?.teamId) {
      conditions.push(`p.team_id = $${paramIndex++}`);
      values.push(filters.teamId);
    }

    if (filters?.domain) {
      conditions.push(`p.domain = $${paramIndex++}`);
      values.push(filters.domain);
    }

    if (filters?.alertLevel) {
      conditions.push(`p.alert_level = $${paramIndex++}`);
      values.push(filters.alertLevel);
    }

    if (filters?.governanceStatus) {
      conditions.push(`p.governance_status = $${paramIndex++}`);
      values.push(filters.governanceStatus);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query<ProjectWithDetailsRow>(
      `SELECT p.${PROJECT_COLUMNS.replace(/,\s*/g, ', p.')},
              d.name AS department_name,
              t.name AS team_name,
              mp.name AS master_project_name
       FROM projects p
       LEFT JOIN departments d ON d.id = p.department_id
       LEFT JOIN teams t ON t.id = p.team_id
       LEFT JOIN projects mp ON mp.id = p.master_project_id
       ${where}
       ORDER BY p.name`,
      values
    );
    return result.rows.map(mapRowWithDetails);
  }

  async findById(id: string): Promise<Project | null> {
    const result = await pool.query<ProjectRow>(
      `SELECT ${PROJECT_COLUMNS} FROM projects WHERE id = $1`,
      [id]
    );
    return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
  }

  async findByName(name: string): Promise<Project | null> {
    const result = await pool.query<ProjectRow>(
      `SELECT ${PROJECT_COLUMNS} FROM projects WHERE LOWER(name) = LOWER($1)`,
      [name]
    );
    return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
  }

  async create(dto: CreateProjectDto): Promise<Project> {
    const result = await pool.query<ProjectRow>(
      `INSERT INTO projects (name, department_id, team_id, master_project_id,
        status, domain, process, app_size, complexity, alert_level, governance_status,
        governance_template, infrastructure_template, operations_template,
        start_date, go_live_date, reference_number, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING ${PROJECT_COLUMNS}`,
      [
        dto.name,
        dto.departmentId ?? null,
        dto.teamId ?? null,
        dto.masterProjectId ?? null,
        dto.status ?? 'Intake',
        dto.domain ?? null,
        dto.process ?? null,
        dto.appSize ?? null,
        dto.complexity ?? null,
        dto.alertLevel ?? 'Green',
        dto.governanceStatus ?? 'Not Started',
        dto.governanceTemplate ?? null,
        dto.infrastructureTemplate ?? null,
        dto.operationsTemplate ?? null,
        dto.startDate ?? null,
        dto.goLiveDate ?? null,
        dto.referenceNumber ?? null,
        dto.description ?? null,
      ]
    );
    return mapRow(result.rows[0]);
  }

  async update(id: string, dto: UpdateProjectDto): Promise<Project | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fieldMap: Record<string, string> = {
      name: 'name',
      departmentId: 'department_id',
      teamId: 'team_id',
      masterProjectId: 'master_project_id',
      status: 'status',
      domain: 'domain',
      process: 'process',
      appSize: 'app_size',
      complexity: 'complexity',
      alertLevel: 'alert_level',
      governanceStatus: 'governance_status',
      governanceTemplate: 'governance_template',
      infrastructureTemplate: 'infrastructure_template',
      operationsTemplate: 'operations_template',
      startDate: 'start_date',
      goLiveDate: 'go_live_date',
      referenceNumber: 'reference_number',
      description: 'description',
    };

    for (const [dtoKey, column] of Object.entries(fieldMap)) {
      if (dtoKey in dto) {
        fields.push(`${column} = $${paramIndex++}`);
        values.push((dto as Record<string, unknown>)[dtoKey]);
      }
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query<ProjectRow>(
      `UPDATE projects SET ${fields.join(', ')} WHERE id = $${paramIndex}
       RETURNING ${PROJECT_COLUMNS}`,
      values
    );
    return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM projects WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async hasChildProjects(id: string): Promise<boolean> {
    const result = await pool.query(
      'SELECT 1 FROM projects WHERE master_project_id = $1 LIMIT 1',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }
}

export const projectRepository = new ProjectRepository();
