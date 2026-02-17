-- Seed: 001_seed_default_roles
-- Create default roles with deterministic UUIDs for delegation hierarchy
-- Idempotent: uses ON CONFLICT DO NOTHING

INSERT INTO user_roles (id, name, description)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Administrator', 'Full system access with all permissions'),
    ('a0000000-0000-0000-0000-000000000002', 'User', 'Standard user with basic permissions'),
    ('a0000000-0000-0000-0000-000000000003', 'Manager', 'Team management with delegated user administration'),
    ('a0000000-0000-0000-0000-000000000004', 'TeamMember', 'Team member with project-level permissions'),
    ('a0000000-0000-0000-0000-000000000005', 'Finance', 'Read-only access to reports for billing')
ON CONFLICT (id) DO NOTHING;

-- Delegation hierarchy:
--   Administrator → can grant User, Manager, TeamMember, Finance
--   Manager       → can grant User, TeamMember, Finance
--   User          → no grantable roles
--   TeamMember    → no grantable roles
--   Finance       → no grantable roles
INSERT INTO user_role_grantable_roles (role_id, grantable_role_id)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002'),
    ('a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003'),
    ('a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004'),
    ('a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002'),
    ('a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000004'),
    ('a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005'),
    ('a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005')
ON CONFLICT DO NOTHING;
