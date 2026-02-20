-- Migration 008: Departments, Teams, Project Roles
-- Epic 1: Organization & People (#6, #7, #8, #9)

-- Departments
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    name_lower VARCHAR(255) GENERATED ALWAYS AS (LOWER(name)) STORED NOT NULL,
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_departments_name_lower UNIQUE (name_lower)
);

CREATE INDEX idx_departments_active ON departments(active);

CREATE TRIGGER trg_departments_updated_at
    BEFORE UPDATE ON departments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Teams (belong to a department)
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    name_lower VARCHAR(255) GENERATED ALWAYS AS (LOWER(name)) STORED NOT NULL,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_teams_name_dept UNIQUE (department_id, name_lower)
);

CREATE INDEX idx_teams_department_id ON teams(department_id);
CREATE INDEX idx_teams_active ON teams(active);

CREATE TRIGGER trg_teams_updated_at
    BEFORE UPDATE ON teams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Project roles (reusable across projects)
CREATE TABLE project_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    name_lower VARCHAR(255) GENERATED ALWAYS AS (LOWER(name)) STORED NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_project_roles_name_lower UNIQUE (name_lower)
);

CREATE TRIGGER trg_project_roles_updated_at
    BEFORE UPDATE ON project_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add department_id and team_id to users table
ALTER TABLE users
    ADD COLUMN department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

CREATE INDEX idx_users_department_id ON users(department_id);
CREATE INDEX idx_users_team_id ON users(team_id);
