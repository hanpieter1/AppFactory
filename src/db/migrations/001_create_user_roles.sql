-- Migration: 001_create_user_roles
-- Create user_roles table and grantable_roles junction table

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User roles table
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    name_lower VARCHAR(100) GENERATED ALWAYS AS (LOWER(name)) STORED NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_roles_name_lower UNIQUE (name_lower)
);

-- Junction table for grantable roles (self-referencing M:N)
CREATE TABLE user_role_grantable_roles (
    role_id UUID NOT NULL REFERENCES user_roles(id) ON DELETE CASCADE,
    grantable_role_id UUID NOT NULL REFERENCES user_roles(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, grantable_role_id),
    CONSTRAINT chk_no_self_grant CHECK (role_id != grantable_role_id)
);

-- Indexes
CREATE INDEX idx_user_roles_name_lower ON user_roles(name_lower);
CREATE INDEX idx_grantable_roles_role_id ON user_role_grantable_roles(role_id);
CREATE INDEX idx_grantable_roles_grantable_role_id ON user_role_grantable_roles(grantable_role_id);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_roles_updated_at
    BEFORE UPDATE ON user_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
