-- Migration 005: Entity Access Control Rules
-- Per-entity CRUD access rules tied to module roles (Story #51)

CREATE TABLE entity_access_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_role_id UUID NOT NULL REFERENCES module_roles(id) ON DELETE CASCADE,
    entity VARCHAR(100) NOT NULL,
    can_create BOOLEAN NOT NULL DEFAULT false,
    can_read BOOLEAN NOT NULL DEFAULT false,
    can_update BOOLEAN NOT NULL DEFAULT false,
    can_delete BOOLEAN NOT NULL DEFAULT false,
    row_filter JSONB,
    field_access JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_entity_access_module_role_entity UNIQUE (module_role_id, entity)
);

-- Index for lookups by module role
CREATE INDEX idx_entity_access_rules_module_role_id ON entity_access_rules(module_role_id);

-- Index for lookups by entity name
CREATE INDEX idx_entity_access_rules_entity ON entity_access_rules(entity);

-- Auto-update updated_at
CREATE TRIGGER trg_entity_access_rules_updated_at
    BEFORE UPDATE ON entity_access_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
