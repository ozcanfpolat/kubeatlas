-- ============================================
-- KubeAtlas Seed Data
-- Version: 1.0.0
-- ============================================

-- ============================================
-- DEFAULT ORGANIZATION
-- ============================================
INSERT INTO organizations (id, name, slug, description, settings)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Default Organization',
    'default',
    'Default organization for initial setup',
    '{"default_timezone": "UTC", "date_format": "YYYY-MM-DD"}'::jsonb
) ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- DEFAULT ADMIN USER
-- Password: admin123 (change immediately after first login)
-- Generated with: bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
-- ============================================
INSERT INTO users (id, organization_id, email, username, full_name, password_hash, role, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'admin@kubeatlas.local',
    'admin',
    'System Administrator',
    '$2a$10$YourHashedPasswordHere', -- REPLACE WITH ACTUAL HASH
    'admin',
    true
) ON CONFLICT (organization_id, email) DO NOTHING;

-- ============================================
-- DEFAULT DOCUMENT CATEGORIES
-- ============================================
INSERT INTO document_categories (id, organization_id, name, slug, description, color, icon, sort_order) VALUES
    (uuid_generate_v4(), NULL, 'Architecture', 'architecture', 'System architecture diagrams and documentation', '#3B82F6', 'diagram', 1),
    (uuid_generate_v4(), NULL, 'Runbook', 'runbook', 'Operational runbooks and procedures', '#10B981', 'book', 2),
    (uuid_generate_v4(), NULL, 'SLA', 'sla', 'Service Level Agreements', '#EF4444', 'shield', 3),
    (uuid_generate_v4(), NULL, 'Disaster Recovery', 'dr', 'Disaster recovery plans', '#F59E0B', 'alert', 4),
    (uuid_generate_v4(), NULL, 'API Documentation', 'api', 'API specifications and documentation', '#8B5CF6', 'code', 5),
    (uuid_generate_v4(), NULL, 'Security', 'security', 'Security policies and assessments', '#EC4899', 'lock', 6),
    (uuid_generate_v4(), NULL, 'Other', 'other', 'Other documentation', '#6B7280', 'file', 99)
ON CONFLICT (organization_id, slug) DO NOTHING;

-- ============================================
-- DEFAULT SYSTEM SETTINGS
-- ============================================
INSERT INTO settings (organization_id, key, value, description) VALUES
    (NULL, 'session_timeout', '{"minutes": 60}'::jsonb, 'User session timeout in minutes'),
    (NULL, 'password_policy', '{"min_length": 8, "require_uppercase": true, "require_lowercase": true, "require_numbers": true, "require_special": true}'::jsonb, 'Password policy configuration'),
    (NULL, 'audit_retention', '{"days": 365}'::jsonb, 'Audit log retention period in days'),
    (NULL, 'sync_interval', '{"minutes": 30}'::jsonb, 'Default cluster sync interval in minutes')
ON CONFLICT (organization_id, key) DO NOTHING;

-- ============================================
-- SAMPLE CLUSTER (Optional - for development)
-- Uncomment to add a sample cluster
-- ============================================
-- INSERT INTO clusters (id, organization_id, name, display_name, api_server_url, cluster_type, environment, status)
-- VALUES (
--     '00000000-0000-0000-0000-000000000003',
--     '00000000-0000-0000-0000-000000000001',
--     'sample-cluster',
--     'Sample Cluster',
--     'https://kubernetes.default.svc',
--     'kubernetes',
--     'development',
--     'inactive'
-- ) ON CONFLICT (organization_id, name) DO NOTHING;
