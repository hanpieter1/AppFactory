-- Migration 006: Route Access Control Rules
-- Per-route access rules tied to module roles with method-level control (Story #52)

CREATE TABLE route_access_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_role_id UUID NOT NULL REFERENCES module_roles(id) ON DELETE CASCADE,
    route VARCHAR(255) NOT NULL,
    methods TEXT[] NOT NULL DEFAULT '{}',
    is_wildcard BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_route_access_module_role_route UNIQUE (module_role_id, route)
);

-- Index for lookups by module role
CREATE INDEX idx_route_access_rules_module_role_id ON route_access_rules(module_role_id);

-- Index for lookups by route
CREATE INDEX idx_route_access_rules_route ON route_access_rules(route);

-- Auto-update updated_at
CREATE TRIGGER trg_route_access_rules_updated_at
    BEFORE UPDATE ON route_access_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
