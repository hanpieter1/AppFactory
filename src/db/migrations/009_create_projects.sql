-- Migration 009: Create projects table
-- Epic 3: Portfolio module - Projects CRUD

CREATE TYPE project_status AS ENUM (
  'Intake', 'Discovery', 'Development', 'Testing', 'Live', 'Decommissioned', 'On Hold'
);

CREATE TYPE project_domain AS ENUM (
  'Finance', 'HR', 'Operations', 'Sales', 'Marketing', 'IT', 'Legal', 'Other'
);

CREATE TYPE project_process AS ENUM (
  'Core', 'Supporting', 'Innovation', 'Other'
);

CREATE TYPE project_app_size AS ENUM (
  'S', 'M', 'L', 'XL'
);

CREATE TYPE project_complexity AS ENUM (
  'Low', 'Medium', 'High', 'Very High'
);

CREATE TYPE project_alert_level AS ENUM (
  'Green', 'Yellow', 'Orange', 'Red'
);

CREATE TYPE project_governance_status AS ENUM (
  'Not Started', 'In Progress', 'Completed', 'Not Applicable'
);

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  name_lower VARCHAR(255) GENERATED ALWAYS AS (LOWER(name)) STORED NOT NULL,

  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  master_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  status project_status NOT NULL DEFAULT 'Intake',
  domain project_domain,
  process project_process,
  app_size project_app_size,
  complexity project_complexity,
  alert_level project_alert_level DEFAULT 'Green',
  governance_status project_governance_status DEFAULT 'Not Started',

  governance_template VARCHAR(255),
  infrastructure_template VARCHAR(255),
  operations_template VARCHAR(255),

  start_date DATE,
  go_live_date DATE,

  reference_number VARCHAR(100),
  description TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_projects_name_lower UNIQUE (name_lower)
);

CREATE INDEX idx_projects_department_id ON projects(department_id);
CREATE INDEX idx_projects_team_id ON projects(team_id);
CREATE INDEX idx_projects_master_project_id ON projects(master_project_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_alert_level ON projects(alert_level);

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
