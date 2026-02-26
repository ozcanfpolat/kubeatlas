-- ============================================
-- KubeAtlas Database Schema
-- Version: 1.0.0
-- Database: PostgreSQL 14+
-- ============================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ORGANIZATION & USERS
-- ============================================

-- Organizations (Multi-tenancy support)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    logo_url VARCHAR(500),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id),
    email VARCHAR(255) NOT NULL,
    username VARCHAR(100),
    full_name VARCHAR(255),
    avatar_url VARCHAR(500),
    phone VARCHAR(50),
    password_hash VARCHAR(255), -- NULL if SSO only
    role VARCHAR(50) DEFAULT 'viewer', -- admin, editor, viewer
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(organization_id, email)
);

-- Teams/Groups
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES teams(id), -- Hierarchical teams
    team_type VARCHAR(50) DEFAULT 'team', -- organization, department, team
    contact_email VARCHAR(255),
    contact_slack VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(organization_id, slug)
);

-- Team memberships
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES teams(id) NOT NULL,
    user_id UUID REFERENCES users(id) NOT NULL,
    role VARCHAR(50) DEFAULT 'member', -- lead, member
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- Business Units
CREATE TABLE business_units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50), -- e.g., "CC-1001"
    description TEXT,
    director_name VARCHAR(255),
    director_email VARCHAR(255),
    cost_center VARCHAR(100),
    parent_id UUID REFERENCES business_units(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(organization_id, code)
);

-- ============================================
-- KUBERNETES RESOURCES
-- ============================================

-- Clusters
CREATE TABLE clusters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    description TEXT,
    api_server_url VARCHAR(500) NOT NULL,
    cluster_type VARCHAR(50) DEFAULT 'kubernetes', -- kubernetes, openshift, rke2, eks, aks, gke
    version VARCHAR(50),
    platform VARCHAR(100), -- e.g., "VMware vSphere", "AWS", "Azure"
    region VARCHAR(100),
    environment VARCHAR(50) DEFAULT 'production', -- production, staging, development, test
    
    -- Connection settings
    auth_method VARCHAR(50) DEFAULT 'serviceaccount', -- serviceaccount, kubeconfig, oidc
    kubeconfig_encrypted BYTEA, -- Encrypted kubeconfig
    service_account_token_encrypted BYTEA,
    skip_tls_verify BOOLEAN DEFAULT false,
    
    -- Ownership
    owner_team_id UUID REFERENCES teams(id),
    responsible_user_id UUID REFERENCES users(id),
    
    -- Status
    status VARCHAR(50) DEFAULT 'active', -- active, inactive, error, syncing
    last_sync_at TIMESTAMP WITH TIME ZONE,
    sync_error TEXT,
    
    -- Metadata
    node_count INTEGER DEFAULT 0,
    namespace_count INTEGER DEFAULT 0,
    tags TEXT[] DEFAULT '{}',
    labels JSONB DEFAULT '{}',
    annotations JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(organization_id, name)
);

-- Namespaces
CREATE TABLE namespaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    cluster_id UUID REFERENCES clusters(id) NOT NULL,
    
    -- Basic info
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    description TEXT,
    
    -- Environment & Criticality
    environment VARCHAR(50), -- production, staging, test, development
    criticality VARCHAR(50) DEFAULT 'tier-3', -- tier-1, tier-2, tier-3
    
    -- Ownership (multiple ownership types)
    infrastructure_owner_team_id UUID REFERENCES teams(id),
    infrastructure_owner_user_id UUID REFERENCES users(id),
    business_unit_id UUID REFERENCES business_units(id),
    application_manager_name VARCHAR(255),
    application_manager_email VARCHAR(255),
    application_manager_phone VARCHAR(50),
    technical_lead_name VARCHAR(255),
    technical_lead_email VARCHAR(255),
    project_manager_name VARCHAR(255),
    project_manager_email VARCHAR(255),
    
    -- SLA Information
    sla_availability VARCHAR(50), -- e.g., "99.99%"
    sla_rto VARCHAR(100), -- Recovery Time Objective
    sla_rpo VARCHAR(100), -- Recovery Point Objective
    support_hours VARCHAR(100), -- e.g., "7/24", "9-18 weekdays"
    escalation_path TEXT,
    
    -- Status
    status VARCHAR(50) DEFAULT 'active', -- active, inactive, pending, archived
    discovered_at TIMESTAMP WITH TIME ZONE,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    
    -- Kubernetes metadata
    k8s_uid VARCHAR(255),
    k8s_labels JSONB DEFAULT '{}',
    k8s_annotations JSONB DEFAULT '{}',
    k8s_created_at TIMESTAMP WITH TIME ZONE,
    
    -- Custom fields
    tags TEXT[] DEFAULT '{}',
    custom_fields JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(cluster_id, name)
);

-- ============================================
-- DEPENDENCIES
-- ============================================

-- Internal Dependencies (within Kubernetes)
CREATE TABLE internal_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    
    -- Source (dependent)
    source_namespace_id UUID REFERENCES namespaces(id) NOT NULL,
    source_resource_type VARCHAR(100), -- deployment, service, etc.
    source_resource_name VARCHAR(255),
    
    -- Target (dependency)
    target_namespace_id UUID REFERENCES namespaces(id) NOT NULL,
    target_resource_type VARCHAR(100),
    target_resource_name VARCHAR(255),
    
    -- Dependency details
    dependency_type VARCHAR(100) NOT NULL, -- api, database, queue, cache, storage
    description TEXT,
    is_critical BOOLEAN DEFAULT false,
    
    -- Discovery
    is_auto_discovered BOOLEAN DEFAULT false,
    discovery_method VARCHAR(100), -- manual, network-policy, service-mesh, label
    
    -- Status
    status VARCHAR(50) DEFAULT 'active', -- active, inactive, deprecated
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID REFERENCES users(id),
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- External Dependencies (outside Kubernetes)
CREATE TABLE external_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    
    -- Source namespace
    namespace_id UUID REFERENCES namespaces(id) NOT NULL,
    
    -- External system details
    name VARCHAR(255) NOT NULL,
    system_type VARCHAR(100) NOT NULL, -- api, database, saas, payment-gateway, etc.
    provider VARCHAR(255), -- e.g., "AWS", "Mastercard", "Salesforce"
    endpoint VARCHAR(500),
    description TEXT,
    
    -- Criticality & SLA
    is_critical BOOLEAN DEFAULT false,
    expected_availability VARCHAR(50),
    
    -- Contact information
    contact_name VARCHAR(255),
    contact_email VARCHAR(255),
    documentation_url VARCHAR(500),
    
    -- Status
    status VARCHAR(50) DEFAULT 'active',
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- DOCUMENTS
-- ============================================

-- Document categories
CREATE TABLE document_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(20),
    icon VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    UNIQUE(organization_id, slug)
);

-- Documents
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    namespace_id UUID REFERENCES namespaces(id), -- NULL if org-level document
    cluster_id UUID REFERENCES clusters(id), -- NULL if namespace-level
    
    -- File info
    name VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    checksum VARCHAR(64),
    
    -- Metadata
    category_id UUID REFERENCES document_categories(id),
    description TEXT,
    tags TEXT[] DEFAULT '{}',
    
    -- Versioning
    version INTEGER DEFAULT 1,
    previous_version_id UUID REFERENCES documents(id),
    
    -- Upload info
    uploaded_by UUID REFERENCES users(id) NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Status
    status VARCHAR(50) DEFAULT 'active', -- active, archived, deleted
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- AUDIT & HISTORY
-- ============================================

-- Audit log for all changes
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    
    -- Who
    user_id UUID REFERENCES users(id),
    user_email VARCHAR(255),
    user_ip VARCHAR(45),
    user_agent TEXT,
    
    -- What
    action VARCHAR(100) NOT NULL, -- create, update, delete, view, export
    resource_type VARCHAR(100) NOT NULL, -- namespace, cluster, document, etc.
    resource_id UUID NOT NULL,
    resource_name VARCHAR(255),
    
    -- Changes
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    
    -- Context
    description TEXT,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- SETTINGS & CONFIGURATIONS
-- ============================================

-- System settings
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id), -- NULL for global settings
    key VARCHAR(255) NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, key)
);

-- API tokens
CREATE TABLE api_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    user_id UUID REFERENCES users(id) NOT NULL,
    name VARCHAR(255) NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    token_prefix VARCHAR(10) NOT NULL, -- First 8 chars for identification
    scopes TEXT[] DEFAULT '{}',
    expires_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revoked_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- NOTIFICATIONS & ALERTS
-- ============================================

-- Notification templates
CREATE TABLE notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    event_type VARCHAR(100) NOT NULL, -- ownership_missing, document_expired, etc.
    channel VARCHAR(50) NOT NULL, -- email, slack, teams, webhook
    subject_template TEXT,
    body_template TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scheduled reports
CREATE TABLE scheduled_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    name VARCHAR(255) NOT NULL,
    report_type VARCHAR(100) NOT NULL, -- ownership_coverage, orphaned_resources, etc.
    schedule VARCHAR(100) NOT NULL, -- cron expression
    recipients TEXT[] NOT NULL,
    format VARCHAR(50) DEFAULT 'pdf', -- pdf, excel, csv
    filters JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Users
CREATE INDEX idx_users_organization ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);

-- Teams
CREATE INDEX idx_teams_organization ON teams(organization_id);
CREATE INDEX idx_teams_parent ON teams(parent_id);

-- Clusters
CREATE INDEX idx_clusters_organization ON clusters(organization_id);
CREATE INDEX idx_clusters_status ON clusters(status);

-- Namespaces
CREATE INDEX idx_namespaces_cluster ON namespaces(cluster_id);
CREATE INDEX idx_namespaces_organization ON namespaces(organization_id);
CREATE INDEX idx_namespaces_environment ON namespaces(environment);
CREATE INDEX idx_namespaces_criticality ON namespaces(criticality);
CREATE INDEX idx_namespaces_infrastructure_owner ON namespaces(infrastructure_owner_team_id);
CREATE INDEX idx_namespaces_business_unit ON namespaces(business_unit_id);
CREATE INDEX idx_namespaces_tags ON namespaces USING GIN(tags);

-- Dependencies
CREATE INDEX idx_internal_deps_source ON internal_dependencies(source_namespace_id);
CREATE INDEX idx_internal_deps_target ON internal_dependencies(target_namespace_id);
CREATE INDEX idx_external_deps_namespace ON external_dependencies(namespace_id);

-- Documents
CREATE INDEX idx_documents_namespace ON documents(namespace_id);
CREATE INDEX idx_documents_cluster ON documents(cluster_id);
CREATE INDEX idx_documents_category ON documents(category_id);

-- Audit logs
CREATE INDEX idx_audit_logs_organization ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- ============================================
-- TRIGGERS
-- ============================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_business_units_updated_at BEFORE UPDATE ON business_units FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_clusters_updated_at BEFORE UPDATE ON clusters FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_namespaces_updated_at BEFORE UPDATE ON namespaces FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_internal_dependencies_updated_at BEFORE UPDATE ON internal_dependencies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_external_dependencies_updated_at BEFORE UPDATE ON external_dependencies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- SEED DATA
-- ============================================

-- Default document categories
INSERT INTO document_categories (id, organization_id, name, slug, description, color, icon, sort_order) VALUES
    (uuid_generate_v4(), NULL, 'Architecture', 'architecture', 'System architecture diagrams and documentation', '#3B82F6', 'diagram', 1),
    (uuid_generate_v4(), NULL, 'Runbook', 'runbook', 'Operational runbooks and procedures', '#10B981', 'book', 2),
    (uuid_generate_v4(), NULL, 'SLA', 'sla', 'Service Level Agreements', '#EF4444', 'shield', 3),
    (uuid_generate_v4(), NULL, 'Disaster Recovery', 'dr', 'Disaster recovery plans', '#F59E0B', 'alert', 4),
    (uuid_generate_v4(), NULL, 'API Documentation', 'api', 'API specifications and documentation', '#8B5CF6', 'code', 5),
    (uuid_generate_v4(), NULL, 'Security', 'security', 'Security policies and assessments', '#EC4899', 'lock', 6),
    (uuid_generate_v4(), NULL, 'Other', 'other', 'Other documentation', '#6B7280', 'file', 99);
