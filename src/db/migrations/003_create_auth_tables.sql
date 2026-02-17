-- Migration: 003_create_auth_tables
-- Create sessions and token_information tables for authentication (#55)

-- Sessions table: tracks active login sessions with CSRF tokens
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    csrf_token VARCHAR(64) NOT NULL,
    last_active TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);

-- Token information table: stores hashed refresh tokens
CREATE TABLE token_information (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL,
    expiry_date TIMESTAMPTZ NOT NULL,
    user_agent VARCHAR(512),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_token_information_user_id ON token_information(user_id);
CREATE INDEX idx_token_information_session_id ON token_information(session_id);
CREATE INDEX idx_token_information_token_hash ON token_information(token_hash);
