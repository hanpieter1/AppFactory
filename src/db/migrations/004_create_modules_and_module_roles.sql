-- Migration: 004_create_modules_and_module_roles
-- Create modules, module_roles, and user_role_module_roles junction tables

-- Modules table
CREATE TABLE modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    name_lower VARCHAR(100) GENERATED ALWAYS AS (LOWER(name)) STORED NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_modules_name_lower UNIQUE (name_lower)
);

-- Module roles table (name unique within module, not globally)
CREATE TABLE module_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    name_lower VARCHAR(100) GENERATED ALWAYS AS (LOWER(name)) STORED NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_module_roles_name_module UNIQUE (module_id, name_lower)
);

-- Junction table: user_role <-> module_role (many-to-many)
CREATE TABLE user_role_module_roles (
    role_id UUID NOT NULL REFERENCES user_roles(id) ON DELETE CASCADE,
    module_role_id UUID NOT NULL REFERENCES module_roles(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, module_role_id)
);

-- Indexes
CREATE INDEX idx_modules_name_lower ON modules(name_lower);
CREATE INDEX idx_module_roles_module_id ON module_roles(module_id);
CREATE INDEX idx_module_roles_name_lower ON module_roles(name_lower);
CREATE INDEX idx_user_role_module_roles_role_id ON user_role_module_roles(role_id);
CREATE INDEX idx_user_role_module_roles_module_role_id ON user_role_module_roles(module_role_id);

-- Triggers for auto-updating updated_at
CREATE TRIGGER update_modules_updated_at
    BEFORE UPDATE ON modules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_module_roles_updated_at
    BEFORE UPDATE ON module_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
