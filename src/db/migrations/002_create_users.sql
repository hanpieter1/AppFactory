-- Migration: 002_create_users
-- Create users table and user_user_roles junction table

-- UserType enum
CREATE TYPE user_type AS ENUM ('Internal', 'External');

-- Users table (combines User + Account entities in single table)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    name_lower VARCHAR(100) GENERATED ALWAYS AS (LOWER(name)) STORED NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    email VARCHAR(255),
    active BOOLEAN NOT NULL DEFAULT true,
    blocked BOOLEAN NOT NULL DEFAULT false,
    blocked_since TIMESTAMPTZ,
    failed_logins INTEGER NOT NULL DEFAULT 0,
    last_login TIMESTAMPTZ,
    web_service_user BOOLEAN NOT NULL DEFAULT false,
    is_anonymous BOOLEAN NOT NULL DEFAULT false,
    is_local_user BOOLEAN NOT NULL DEFAULT true,
    user_type user_type NOT NULL DEFAULT 'Internal',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_users_name_lower UNIQUE (name_lower)
);

-- Junction table: users <-> user_roles (many-to-many)
CREATE TABLE user_user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES user_roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- Indexes
CREATE INDEX idx_users_name_lower ON users(name_lower);
CREATE INDEX idx_users_active ON users(active);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_user_roles_user_id ON user_user_roles(user_id);
CREATE INDEX idx_user_user_roles_role_id ON user_user_roles(role_id);

-- Trigger to auto-update updated_at (reuses function from migration 001)
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
