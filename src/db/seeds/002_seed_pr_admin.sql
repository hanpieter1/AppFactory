-- Seed: 002_seed_pr_admin
-- Create PR_Admin user with Administrator role (dev/testing only)
-- Password: "1" (bcrypt hash with 10 salt rounds)
-- Idempotent: uses ON CONFLICT DO NOTHING

INSERT INTO users (id, name, password, full_name, active, web_service_user, is_local_user, user_type)
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'PR_Admin',
    '$2b$10$tyUv/GMID8HS.ZKm7vW.F.zq6PTGYFv4HulY1O7VsVaUj7g6l0rrG',
    'Default Administrator',
    true,
    false,
    true,
    'Internal'
)
ON CONFLICT (id) DO NOTHING;

-- Assign Administrator role to PR_Admin
INSERT INTO user_user_roles (user_id, role_id)
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001'
)
ON CONFLICT DO NOTHING;
