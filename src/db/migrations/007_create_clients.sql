-- Migration 007: Create clients table
-- Allows managers to create and manage clients for project association

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unique constraint on client code
CREATE UNIQUE INDEX uq_client_code ON clients (code);

-- Index for active clients lookup
CREATE INDEX idx_clients_active ON clients (active);
