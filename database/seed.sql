-- ==============================================
-- KubeAtlas Seed Data
-- Run after schema.sql
-- ==============================================

-- Default Organization
INSERT INTO organizations (id, name, slug, settings) 
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Default Organization',
    'default',
    '{"theme": "dark"}'
) ON CONFLICT (id) DO NOTHING;

-- Admin User (password: admin123)
-- Password hash: bcrypt of 'admin123'
INSERT INTO users (id, organization_id, email, password_hash, full_name, role, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'admin@kubeatlas.local',
    '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqKnBBmMQ/UYXF1VLZ1tBbXKJVdCy',
    'System Administrator',
    'admin',
    true
) ON CONFLICT (id) DO NOTHING;

-- Default Teams
INSERT INTO teams (id, organization_id, name, slug, team_type, description) VALUES
    ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Platform Team', 'platform-team', 'team', 'Infrastructure and Platform Engineering'),
    ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'DevOps Team', 'devops-team', 'team', 'DevOps and SRE'),
    ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'Development Team', 'development-team', 'team', 'Application Development')
ON CONFLICT (id) DO NOTHING;

-- Default Business Units
INSERT INTO business_units (id, organization_id, name, code, description) VALUES
    ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', 'IT Operations', 'IT-OPS', 'IT Infrastructure and Operations'),
    ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000001', 'Software Development', 'SW-DEV', 'Software Development Department'),
    ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000001', 'Data Analytics', 'DATA', 'Data and Analytics Department')
ON CONFLICT (id) DO NOTHING;

-- Document Categories (Global - no organization_id)
INSERT INTO document_categories (id, organization_id, name, slug, description, color, icon, sort_order) VALUES
    ('00000000-0000-0000-0000-000000000030', NULL, 'Architecture', 'architecture', 'Architecture diagrams and design documents', '#3b82f6', 'layout', 1),
    ('00000000-0000-0000-0000-000000000031', NULL, 'Runbook', 'runbook', 'Operational runbooks and procedures', '#22c55e', 'book-open', 2),
    ('00000000-0000-0000-0000-000000000032', NULL, 'SLA', 'sla', 'Service Level Agreements', '#ef4444', 'file-check', 3),
    ('00000000-0000-0000-0000-000000000033', NULL, 'API Documentation', 'api-docs', 'API specifications and documentation', '#8b5cf6', 'code', 4),
    ('00000000-0000-0000-0000-000000000034', NULL, 'Security', 'security', 'Security policies and assessments', '#f97316', 'shield', 5),
    ('00000000-0000-0000-0000-000000000035', NULL, 'Disaster Recovery', 'disaster-recovery', 'DR plans and procedures', '#ec4899', 'alert-triangle', 6),
    ('00000000-0000-0000-0000-000000000036', NULL, 'Other', 'other', 'Other documents', '#6b7280', 'file', 99)
ON CONFLICT (id) DO NOTHING;
