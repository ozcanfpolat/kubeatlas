-- ============================================
-- Seed Data: Default Organization and Admin User
-- ============================================

-- Insert default organization
INSERT INTO organizations (id, name, slug, settings, created_at, updated_at)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Default Organization',
    'default',
    '{"theme": "light", "timezone": "UTC"}',
    NOW(),
    NOW()
) ON CONFLICT (slug) DO NOTHING;

-- Insert admin user (password: admin123)
-- Password hash generated with bcrypt cost 10
INSERT INTO users (id, organization_id, email, password_hash, full_name, role, is_active, created_at, updated_at)
VALUES (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'admin@kubeatlas.local',
    '$2a$10$5eko.ZWBBQmNyZYKyRKW/uX28i/CYhqMK.VklBpmhQskLY6P4UtPi',
    'System Administrator',
    'admin',
    true,
    NOW(),
    NOW()
) ON CONFLICT (organization_id, email) DO NOTHING;

-- Insert default admin team
INSERT INTO teams (id, organization_id, name, description, created_at, updated_at)
VALUES (
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Platform Team',
    'Default platform administration team',
    NOW(),
    NOW()
) ON CONFLICT DO NOTHING;

-- Add admin to platform team
INSERT INTO team_members (id, team_id, user_id, role, joined_at)
VALUES (
    'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'lead',
    NOW()
) ON CONFLICT DO NOTHING;
