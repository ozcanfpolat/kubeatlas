// ============================================
// Common Types
// ============================================

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface ApiResponse<T> {
  data: T
}

export interface ApiError {
  error: string
  request_id?: string
}

// ============================================
// User & Auth Types
// ============================================

export interface User {
  id: string
  organization_id: string
  email: string
  username?: string
  full_name?: string
  avatar_url?: string
  phone?: string
  role: 'admin' | 'editor' | 'viewer'
  is_active: boolean
  last_login_at?: string
  created_at: string
}

export interface TokenPair {
  access_token: string
  refresh_token: string
  expires_at: string
  token_type: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  tokens: TokenPair
  user: User
}

// ============================================
// Organization Types
// ============================================

export interface Team {
  id: string
  organization_id: string
  name: string
  slug: string
  description?: string
  parent_id?: string
  team_type: 'organization' | 'department' | 'team'
  contact_email?: string
  contact_slack?: string
  member_count?: number
  created_at: string
  updated_at: string
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  role: 'lead' | 'member'
  joined_at: string
  user?: User
}

export interface BusinessUnit {
  id: string
  organization_id: string
  name: string
  code?: string
  description?: string
  director_name?: string
  director_email?: string
  cost_center?: string
  parent_id?: string
  created_at: string
  updated_at: string
}

// ============================================
// Cluster Types
// ============================================

export interface Cluster {
  id: string
  organization_id: string
  name: string
  display_name?: string
  description?: string
  api_server_url: string
  cluster_type: 'kubernetes' | 'openshift' | 'rke2' | 'eks' | 'aks' | 'gke'
  version?: string
  platform?: string
  region?: string
  environment: 'production' | 'staging' | 'development' | 'test'
  skip_tls_verify: boolean
  owner_team_id?: string
  responsible_user_id?: string
  status: 'active' | 'inactive' | 'error' | 'syncing' | 'pending'
  last_sync_at?: string
  sync_error?: string
  node_count: number
  namespace_count: number
  tags: string[]
  created_at: string
  updated_at: string
  
  // Computed
  owner_team?: Team
  responsible_user?: User
}

export interface CreateClusterRequest {
  name: string
  display_name?: string
  description?: string
  api_server_url: string
  cluster_type: string
  version?: string
  platform?: string
  region?: string
  environment: string
  auth_method?: string
  service_account_token?: string
  kubeconfig?: string
  skip_tls_verify?: boolean
  owner_team_id?: string
  responsible_user_id?: string
  tags?: string[]
}

// ============================================
// Namespace Types
// ============================================

export interface Namespace {
  id: string
  organization_id: string
  cluster_id: string
  name: string
  display_name?: string
  description?: string
  environment?: string
  criticality: 'tier-1' | 'tier-2' | 'tier-3'
  
  // Ownership
  infrastructure_owner_team_id?: string
  infrastructure_owner_user_id?: string
  business_unit_id?: string
  application_manager_name?: string
  application_manager_email?: string
  application_manager_phone?: string
  technical_lead_name?: string
  technical_lead_email?: string
  project_manager_name?: string
  project_manager_email?: string
  
  // SLA
  sla_availability?: string
  sla_rto?: string
  sla_rpo?: string
  support_hours?: string
  escalation_path?: string
  
  // Status
  status: string
  discovered_at?: string
  last_sync_at?: string
  
  // K8s metadata
  k8s_uid?: string
  k8s_labels?: Record<string, string>
  k8s_annotations?: Record<string, string>
  k8s_created_at?: string
  
  // Custom
  tags: string[]
  custom_fields?: Record<string, unknown>
  
  created_at: string
  updated_at: string
  
  // Computed
  cluster?: Cluster
  infrastructure_owner_team?: Team
  business_unit?: BusinessUnit
  document_count?: number
  dependency_count?: number
}

export interface UpdateNamespaceRequest {
  display_name?: string
  description?: string
  environment?: string
  criticality?: string
  infrastructure_owner_team_id?: string | null
  infrastructure_owner_user_id?: string | null
  business_unit_id?: string | null
  application_manager_name?: string
  application_manager_email?: string
  application_manager_phone?: string
  technical_lead_name?: string
  technical_lead_email?: string
  project_manager_name?: string
  project_manager_email?: string
  sla_availability?: string
  sla_rto?: string
  sla_rpo?: string
  support_hours?: string
  escalation_path?: string
  tags?: string[]
  custom_fields?: Record<string, unknown>
}

// ============================================
// Dependency Types
// ============================================

export interface InternalDependency {
  id: string
  organization_id: string
  source_namespace_id: string
  source_resource_type?: string
  source_resource_name?: string
  target_namespace_id: string
  target_resource_type?: string
  target_resource_name?: string
  dependency_type: 'api' | 'database' | 'queue' | 'cache' | 'storage'
  description?: string
  is_critical: boolean
  is_auto_discovered: boolean
  discovery_method?: string
  status: string
  verified_at?: string
  verified_by?: string
  created_at: string
  updated_at: string
  
  // Computed
  source_namespace?: Namespace
  target_namespace?: Namespace
}

export interface ExternalDependency {
  id: string
  organization_id: string
  namespace_id: string
  name: string
  system_type: 'api' | 'database' | 'saas' | 'payment-gateway'
  provider?: string
  endpoint?: string
  description?: string
  is_critical: boolean
  expected_availability?: string
  contact_name?: string
  contact_email?: string
  documentation_url?: string
  status: string
  created_at: string
  updated_at: string
}

export interface DependencyGraph {
  nodes: DependencyNode[]
  edges: DependencyEdge[]
}

export interface DependencyNode {
  id: string
  name: string
  type: 'namespace' | 'external'
  cluster_id?: string
  cluster_name?: string
  environment?: string
  criticality?: string
}

export interface DependencyEdge {
  source: string
  target: string
  dependency_type: string
  is_critical: boolean
}

// ============================================
// Document Types
// ============================================

export interface Document {
  id: string
  organization_id: string
  namespace_id?: string
  cluster_id?: string
  name: string
  file_name: string
  file_size: number
  mime_type: string
  checksum?: string
  category_id?: string
  description?: string
  tags: string[]
  version: number
  uploaded_by: string
  uploaded_at: string
  status: string
  created_at: string
  updated_at: string
  
  // Computed
  category?: DocumentCategory
  uploaded_by_user?: User
  namespace?: Namespace
}

export interface DocumentCategory {
  id: string
  organization_id?: string
  name: string
  slug: string
  description?: string
  color?: string
  icon?: string
  sort_order: number
}

// ============================================
// Dashboard Types
// ============================================

export interface DashboardStats {
  total_clusters: number
  total_namespaces: number
  total_nodes: number
  active_clusters: number
  namespaces_with_owner: number
  ownership_percentage: number
  namespaces_documented: number
  documentation_percentage: number
  namespaces_with_dependencies: number
  dependency_percentage: number
  orphaned_namespaces: number
  undocumented_namespaces: number
  no_deps_namespaces: number
  no_business_unit: number
}

export interface EnvironmentDistribution {
  environment: string
  count: number
}

export interface BusinessUnitDistribution {
  business_unit_id?: string
  business_unit_name: string
  count: number
}

export interface MissingInfo {
  orphaned: MissingInfoItem[]
  undocumented: MissingInfoItem[]
  no_dependencies: MissingInfoItem[]
  no_business_unit: MissingInfoItem[]
}

export interface MissingInfoItem {
  id: string
  name: string
  cluster_id: string
  cluster_name?: string
  missing_type: string
}

// ============================================
// Audit Types
// ============================================

export interface AuditLog {
  id: string
  organization_id: string
  user_id?: string
  user_email?: string
  user_ip?: string
  action: string
  resource_type: string
  resource_id: string
  resource_name?: string
  old_values?: Record<string, unknown>
  new_values?: Record<string, unknown>
  changed_fields?: string[]
  description?: string
  created_at: string
  
  // Computed
  user?: User
}
