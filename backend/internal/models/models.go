package models

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"regexp"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)

// ============================================
// Custom Nullable Types with proper JSON serialization
// ============================================

// NullString is a nullable string with proper JSON serialization
// String and Valid are exported for database scanning but hidden from JSON
type NullString struct {
	String string `json:"-"`
	Valid  bool   `json:"-"`
}

func (ns NullString) MarshalJSON() ([]byte, error) {
	if !ns.Valid {
		return []byte("null"), nil
	}
	return json.Marshal(ns.String)
}

func (ns *NullString) UnmarshalJSON(data []byte) error {
	var s *string
	if err := json.Unmarshal(data, &s); err != nil {
		return err
	}
	if s != nil {
		ns.Valid = true
		ns.String = *s
	} else {
		ns.Valid = false
		ns.String = ""
	}
	return nil
}

// Scan implements sql.Scanner interface
func (ns *NullString) Scan(value interface{}) error {
	if value == nil {
		ns.String, ns.Valid = "", false
		return nil
	}
	ns.Valid = true
	switch v := value.(type) {
	case string:
		ns.String = v
	case []byte:
		ns.String = string(v)
	default:
		return errors.New("incompatible type for NullString")
	}
	return nil
}

// Value implements driver.Valuer interface
func (ns NullString) Value() (driver.Value, error) {
	if !ns.Valid {
		return nil, nil
	}
	return ns.String, nil
}

// NewNullString creates a NullString from a string pointer
func NewNullString(s *string) NullString {
	if s == nil {
		return NullString{Valid: false}
	}
	return NullString{String: *s, Valid: true}
}

// NewNullStringFromString creates a NullString from a string (empty string = null)
func NewNullStringFromString(s string) NullString {
	if s == "" {
		return NullString{Valid: false}
	}
	return NullString{String: s, Valid: true}
}

// Ptr returns a pointer to the string value, or nil if not valid
func (ns NullString) Ptr() *string {
	if !ns.Valid {
		return nil
	}
	return &ns.String
}

// ValueOrEmpty returns the string value or empty string if not valid
func (ns NullString) ValueOrEmpty() string {
	if !ns.Valid {
		return ""
	}
	return ns.String
}

// NullTime is a nullable time with proper JSON serialization
type NullTime struct {
	Time  time.Time `json:"-"`
	Valid bool      `json:"-"`
}

func (nt NullTime) MarshalJSON() ([]byte, error) {
	if !nt.Valid {
		return []byte("null"), nil
	}
	return json.Marshal(nt.Time)
}

func (nt *NullTime) UnmarshalJSON(data []byte) error {
	var t *time.Time
	if err := json.Unmarshal(data, &t); err != nil {
		return err
	}
	if t != nil {
		nt.Valid = true
		nt.Time = *t
	} else {
		nt.Valid = false
	}
	return nil
}

// Scan implements sql.Scanner interface for NullTime
func (nt *NullTime) Scan(value interface{}) error {
	if value == nil {
		nt.Time, nt.Valid = time.Time{}, false
		return nil
	}
	nt.Valid = true
	switch v := value.(type) {
	case time.Time:
		nt.Time = v
	default:
		return errors.New("incompatible type for NullTime")
	}
	return nil
}

// Value implements driver.Valuer interface for NullTime
func (nt NullTime) Value() (driver.Value, error) {
	if !nt.Valid {
		return nil, nil
	}
	return nt.Time, nil
}

// Ptr returns a pointer to the time value, or nil if not valid
func (nt NullTime) Ptr() *time.Time {
	if !nt.Valid {
		return nil
	}
	return &nt.Time
}

// ============================================
// Base Models
// ============================================

// BaseModel contains common fields for all models
type BaseModel struct {
	ID        uuid.UUID    `json:"id" db:"id"`
	CreatedAt time.Time    `json:"created_at" db:"created_at"`
	UpdatedAt time.Time    `json:"updated_at" db:"updated_at"`
	DeletedAt NullTime `json:"-" db:"deleted_at"`
}

// ============================================
// Organization & Users
// ============================================

// Organization represents a tenant in multi-tenant setup
type Organization struct {
	BaseModel
	Name        string         `json:"name" db:"name"`
	Slug        string         `json:"slug" db:"slug"`
	Description NullString `json:"description" db:"description"`
	LogoURL     NullString `json:"logo_url" db:"logo_url"`
	Settings    JSONMap        `json:"settings" db:"settings"`
}

// User represents a user in the system
type User struct {
	BaseModel
	OrganizationID uuid.UUID      `json:"organization_id" db:"organization_id"`
	Email          string         `json:"email" db:"email"`
	Username       NullString `json:"username" db:"username"`
	FullName       NullString `json:"full_name" db:"full_name"`
	AvatarURL      NullString `json:"avatar_url" db:"avatar_url"`
	Phone          NullString `json:"phone" db:"phone"`
	PasswordHash   NullString `json:"-" db:"password_hash"`
	Role           string         `json:"role" db:"role"` // admin, editor, viewer
	IsActive       bool           `json:"is_active" db:"is_active"`
	LastLoginAt    NullTime   `json:"last_login_at" db:"last_login_at"`
	Settings       JSONMap        `json:"settings" db:"settings"`
}

// UserResponse is the user data returned to clients (no sensitive data)
type UserResponse struct {
	ID             uuid.UUID  `json:"id"`
	OrganizationID uuid.UUID  `json:"organization_id"`
	Email          string     `json:"email"`
	Username       string     `json:"username,omitempty"`
	FullName       string     `json:"full_name,omitempty"`
	AvatarURL      string     `json:"avatar_url,omitempty"`
	Phone          string     `json:"phone,omitempty"`
	Role           string     `json:"role"`
	IsActive       bool       `json:"is_active"`
	LastLoginAt    *time.Time `json:"last_login_at,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
}

// Team represents a team/group
type Team struct {
	BaseModel
	OrganizationID uuid.UUID      `json:"organization_id" db:"organization_id"`
	Name           string         `json:"name" db:"name"`
	Slug           string         `json:"slug" db:"slug"`
	Description    NullString `json:"description" db:"description"`
	ParentID       *uuid.UUID     `json:"parent_id" db:"parent_id"`
	TeamType       string         `json:"team_type" db:"team_type"` // organization, department, team
	ContactEmail   NullString `json:"contact_email" db:"contact_email"`
	ContactSlack   NullString `json:"contact_slack" db:"contact_slack"`
	Metadata       JSONMap        `json:"metadata" db:"metadata"`

	// Computed fields (not in DB)
	MemberCount int    `json:"member_count,omitempty" db:"-"`
	Members     []User `json:"members,omitempty" db:"-"`
}

// TeamMember represents a user's membership in a team
type TeamMember struct {
	ID       uuid.UUID `json:"id" db:"id"`
	TeamID   uuid.UUID `json:"team_id" db:"team_id"`
	UserID   uuid.UUID `json:"user_id" db:"user_id"`
	Role     string    `json:"role" db:"role"` // lead, member
	JoinedAt time.Time `json:"joined_at" db:"joined_at"`

	// Computed fields
	User *User `json:"user,omitempty" db:"-"`
}

// BusinessUnit represents a business department
type BusinessUnit struct {
	BaseModel
	OrganizationID uuid.UUID      `json:"organization_id" db:"organization_id"`
	Name           string         `json:"name" db:"name"`
	Code           NullString `json:"code" db:"code"`
	Description    NullString `json:"description" db:"description"`
	DirectorName   NullString `json:"director_name" db:"director_name"`
	DirectorEmail  NullString `json:"director_email" db:"director_email"`
	CostCenter     NullString `json:"cost_center" db:"cost_center"`
	ParentID       *uuid.UUID     `json:"parent_id" db:"parent_id"`
	Metadata       JSONMap        `json:"metadata" db:"metadata"`
}

// ============================================
// Kubernetes Resources
// ============================================

// Cluster represents a Kubernetes cluster
type Cluster struct {
	BaseModel
	OrganizationID uuid.UUID      `json:"organization_id" db:"organization_id"`
	Name           string         `json:"name" db:"name"`
	DisplayName    NullString `json:"display_name" db:"display_name"`
	Description    NullString `json:"description" db:"description"`
	APIServerURL   string         `json:"api_server_url" db:"api_server_url"`
	ClusterType    string         `json:"cluster_type" db:"cluster_type"` // kubernetes, openshift, rke2, eks, aks, gke
	Version        NullString `json:"version" db:"version"`
	Platform       NullString `json:"platform" db:"platform"`
	Region         NullString `json:"region" db:"region"`
	Environment    string         `json:"environment" db:"environment"` // production, staging, development, test

	// Connection settings
	AuthMethod                   string `json:"auth_method" db:"auth_method"`
	KubeconfigEncrypted          []byte `json:"-" db:"kubeconfig_encrypted"`
	ServiceAccountTokenEncrypted []byte `json:"-" db:"service_account_token_encrypted"`
	CACertificateEncrypted       []byte `json:"-" db:"ca_certificate_encrypted"`
	SkipTLSVerify                bool   `json:"skip_tls_verify" db:"skip_tls_verify"`

	// Ownership
	OwnerTeamID       *uuid.UUID `json:"owner_team_id" db:"owner_team_id"`
	ResponsibleUserID *uuid.UUID `json:"responsible_user_id" db:"responsible_user_id"`

	// Status
	Status     string         `json:"status" db:"status"` // active, inactive, error, syncing
	LastSyncAt NullTime   `json:"last_sync_at" db:"last_sync_at"`
	SyncError  NullString `json:"sync_error" db:"sync_error"`

	// Metadata
	NodeCount      int            `json:"node_count" db:"node_count"`
	NamespaceCount int            `json:"namespace_count" db:"namespace_count"`
	Tags           pq.StringArray `json:"tags" db:"tags"`
	Labels         JSONMap        `json:"labels" db:"labels"`
	Annotations    JSONMap        `json:"annotations" db:"annotations"`
	Metadata       JSONMap        `json:"metadata" db:"metadata"`

	// Computed fields
	OwnerTeam       *Team `json:"owner_team,omitempty" db:"-"`
	ResponsibleUser *User `json:"responsible_user,omitempty" db:"-"`
}

// Namespace represents a Kubernetes namespace
type Namespace struct {
	BaseModel
	OrganizationID uuid.UUID `json:"organization_id" db:"organization_id"`
	ClusterID      uuid.UUID `json:"cluster_id" db:"cluster_id"`

	// Basic info
	Name        string         `json:"name" db:"name"`
	DisplayName NullString `json:"display_name" db:"display_name"`
	Description NullString `json:"description" db:"description"`

	// Environment & Criticality
	Environment string `json:"environment" db:"environment"` // production, staging, test, development
	Criticality string `json:"criticality" db:"criticality"` // tier-1, tier-2, tier-3

	// Ownership
	InfrastructureOwnerTeamID *uuid.UUID     `json:"infrastructure_owner_team_id" db:"infrastructure_owner_team_id"`
	InfrastructureOwnerUserID *uuid.UUID     `json:"infrastructure_owner_user_id" db:"infrastructure_owner_user_id"`
	BusinessUnitID            *uuid.UUID     `json:"business_unit_id" db:"business_unit_id"`
	ApplicationManagerName    NullString `json:"application_manager_name" db:"application_manager_name"`
	ApplicationManagerEmail   NullString `json:"application_manager_email" db:"application_manager_email"`
	ApplicationManagerPhone   NullString `json:"application_manager_phone" db:"application_manager_phone"`
	TechnicalLeadName         NullString `json:"technical_lead_name" db:"technical_lead_name"`
	TechnicalLeadEmail        NullString `json:"technical_lead_email" db:"technical_lead_email"`
	ProjectManagerName        NullString `json:"project_manager_name" db:"project_manager_name"`
	ProjectManagerEmail       NullString `json:"project_manager_email" db:"project_manager_email"`

	// SLA Information
	SLAAvailability NullString `json:"sla_availability" db:"sla_availability"`
	SLARTO          NullString `json:"sla_rto" db:"sla_rto"`
	SLARPO          NullString `json:"sla_rpo" db:"sla_rpo"`
	SupportHours    NullString `json:"support_hours" db:"support_hours"`
	EscalationPath  NullString `json:"escalation_path" db:"escalation_path"`

	// Status
	Status       string       `json:"status" db:"status"`
	DiscoveredAt NullTime `json:"discovered_at" db:"discovered_at"`
	LastSyncAt   NullTime `json:"last_sync_at" db:"last_sync_at"`

	// Kubernetes metadata
	K8sUID         NullString `json:"k8s_uid" db:"k8s_uid"`
	K8sLabels      JSONMap        `json:"k8s_labels" db:"k8s_labels"`
	K8sAnnotations JSONMap        `json:"k8s_annotations" db:"k8s_annotations"`
	K8sCreatedAt   NullTime   `json:"k8s_created_at" db:"k8s_created_at"`

	// Custom fields
	Tags         pq.StringArray `json:"tags" db:"tags"`
	CustomFields JSONMap        `json:"custom_fields" db:"custom_fields"`
	Metadata     JSONMap        `json:"metadata" db:"metadata"`

	// Computed fields (not in DB)
	Cluster                 *Cluster      `json:"cluster,omitempty" db:"-"`
	InfrastructureOwnerTeam *Team         `json:"infrastructure_owner_team,omitempty" db:"-"`
	BusinessUnit            *BusinessUnit `json:"business_unit,omitempty" db:"-"`
	DocumentCount           int           `json:"document_count,omitempty" db:"-"`
	DependencyCount         int           `json:"dependency_count,omitempty" db:"-"`
}

// ============================================
// Dependencies
// ============================================

// InternalDependency represents a dependency within the cluster
type InternalDependency struct {
	BaseModel
	OrganizationID uuid.UUID `json:"organization_id" db:"organization_id"`

	// Source
	SourceNamespaceID  uuid.UUID      `json:"source_namespace_id" db:"source_namespace_id"`
	SourceResourceType NullString `json:"source_resource_type" db:"source_resource_type"`
	SourceResourceName NullString `json:"source_resource_name" db:"source_resource_name"`

	// Target
	TargetNamespaceID  uuid.UUID      `json:"target_namespace_id" db:"target_namespace_id"`
	TargetResourceType NullString `json:"target_resource_type" db:"target_resource_type"`
	TargetResourceName NullString `json:"target_resource_name" db:"target_resource_name"`

	// Details
	DependencyType   string         `json:"dependency_type" db:"dependency_type"` // api, database, queue, cache, storage
	Description      NullString `json:"description" db:"description"`
	IsCritical       bool           `json:"is_critical" db:"is_critical"`
	IsAutoDiscovered bool           `json:"is_auto_discovered" db:"is_auto_discovered"`
	DiscoveryMethod  NullString `json:"discovery_method" db:"discovery_method"`

	// Status
	Status     string       `json:"status" db:"status"`
	VerifiedAt NullTime `json:"verified_at" db:"verified_at"`
	VerifiedBy *uuid.UUID   `json:"verified_by" db:"verified_by"`

	Metadata JSONMap `json:"metadata" db:"metadata"`

	// Computed fields
	SourceNamespace *Namespace `json:"source_namespace,omitempty" db:"-"`
	TargetNamespace *Namespace `json:"target_namespace,omitempty" db:"-"`
}

// ExternalDependency represents an external system dependency
type ExternalDependency struct {
	BaseModel
	OrganizationID uuid.UUID `json:"organization_id" db:"organization_id"`
	NamespaceID    uuid.UUID `json:"namespace_id" db:"namespace_id"`

	// External system details
	Name        string         `json:"name" db:"name"`
	SystemType  string         `json:"system_type" db:"system_type"` // api, database, saas, payment-gateway
	Provider    NullString `json:"provider" db:"provider"`
	Endpoint    NullString `json:"endpoint" db:"endpoint"`
	Description NullString `json:"description" db:"description"`

	// Criticality
	IsCritical           bool           `json:"is_critical" db:"is_critical"`
	ExpectedAvailability NullString `json:"expected_availability" db:"expected_availability"`

	// Contact
	ContactName      NullString `json:"contact_name" db:"contact_name"`
	ContactEmail     NullString `json:"contact_email" db:"contact_email"`
	DocumentationURL NullString `json:"documentation_url" db:"documentation_url"`

	Status   string  `json:"status" db:"status"`
	Metadata JSONMap `json:"metadata" db:"metadata"`

	// Computed fields
	Namespace *Namespace `json:"namespace,omitempty" db:"-"`
}

// ============================================
// Documents
// ============================================

// DocumentCategory represents a document category
type DocumentCategory struct {
	ID             uuid.UUID      `json:"id" db:"id"`
	OrganizationID *uuid.UUID     `json:"organization_id" db:"organization_id"`
	Name           string         `json:"name" db:"name"`
	Slug           string         `json:"slug" db:"slug"`
	Description    NullString `json:"description" db:"description"`
	Color          NullString `json:"color" db:"color"`
	Icon           NullString `json:"icon" db:"icon"`
	SortOrder      int            `json:"sort_order" db:"sort_order"`
}

// Document represents an uploaded document
type Document struct {
	BaseModel
	OrganizationID uuid.UUID  `json:"organization_id" db:"organization_id"`
	NamespaceID    *uuid.UUID `json:"namespace_id" db:"namespace_id"`
	ClusterID      *uuid.UUID `json:"cluster_id" db:"cluster_id"`

	// File info
	Name     string         `json:"name" db:"name"`
	FileName string         `json:"file_name" db:"file_name"`
	FilePath string         `json:"-" db:"file_path"`
	FileSize int64          `json:"file_size" db:"file_size"`
	MimeType string         `json:"mime_type" db:"mime_type"`
	Checksum NullString `json:"checksum" db:"checksum"`

	// Metadata
	CategoryID  *uuid.UUID     `json:"category_id" db:"category_id"`
	Description NullString `json:"description" db:"description"`
	Tags        pq.StringArray `json:"tags" db:"tags"`

	// Versioning
	Version           int        `json:"version" db:"version"`
	PreviousVersionID *uuid.UUID `json:"previous_version_id" db:"previous_version_id"`

	// Upload info
	UploadedBy uuid.UUID `json:"uploaded_by" db:"uploaded_by"`
	UploadedAt time.Time `json:"uploaded_at" db:"uploaded_at"`

	Status   string  `json:"status" db:"status"`
	Metadata JSONMap `json:"metadata" db:"metadata"`

	// Computed fields
	Namespace      *Namespace        `json:"namespace,omitempty" db:"-"`
	Category       *DocumentCategory `json:"category,omitempty" db:"-"`
	UploadedByUser *User             `json:"uploaded_by_user,omitempty" db:"-"`
}

// ============================================
// Audit
// ============================================

// AuditLog represents an audit log entry
type AuditLog struct {
	ID             uuid.UUID `json:"id" db:"id"`
	OrganizationID uuid.UUID `json:"organization_id" db:"organization_id"`

	// Who
	UserID    *uuid.UUID     `json:"user_id" db:"user_id"`
	UserEmail NullString `json:"user_email" db:"user_email"`
	UserIP    NullString `json:"user_ip" db:"user_ip"`
	UserAgent NullString `json:"user_agent" db:"user_agent"`

	// What
	Action       string         `json:"action" db:"action"` // create, update, delete, view, export
	ResourceType string         `json:"resource_type" db:"resource_type"`
	ResourceID   uuid.UUID      `json:"resource_id" db:"resource_id"`
	ResourceName NullString `json:"resource_name" db:"resource_name"`

	// Changes
	OldValues     JSONMap        `json:"old_values" db:"old_values"`
	NewValues     JSONMap        `json:"new_values" db:"new_values"`
	ChangedFields pq.StringArray `json:"changed_fields" db:"changed_fields"`

	Description NullString `json:"description" db:"description"`
	Metadata    JSONMap        `json:"metadata" db:"metadata"`
	CreatedAt   time.Time      `json:"created_at" db:"created_at"`

	// Computed fields
	User *User `json:"user,omitempty" db:"-"`
}

// ============================================
// Helper Types
// ============================================

// JSONMap is a helper type for JSONB columns
type JSONMap map[string]interface{}

// DashboardStats represents dashboard statistics
type DashboardStats struct {
	TotalClusters          int `json:"total_clusters"`
	TotalNamespaces        int `json:"total_namespaces"`
	NamespacesWithOwner    int `json:"namespaces_with_owner"`
	NamespacesDocumented   int `json:"namespaces_documented"`
	NamespacesWithDeps     int `json:"namespaces_with_dependencies"`
	OrphanedNamespaces     int `json:"orphaned_namespaces"`
	UndocumentedNamespaces int `json:"undocumented_namespaces"`
	NoDepsNamespaces       int `json:"no_deps_namespaces"`
	NoBusinessUnit         int `json:"no_business_unit"`
}

// EnvironmentDistribution represents namespace distribution by environment
type EnvironmentDistribution struct {
	Environment string `json:"environment"`
	Count       int    `json:"count"`
}

// BusinessUnitDistribution represents namespace distribution by business unit
type BusinessUnitDistribution struct {
	BusinessUnitID   *uuid.UUID `json:"business_unit_id"`
	BusinessUnitName string     `json:"business_unit_name"`
	Count            int        `json:"count"`
}

// ============================================
// Validation Methods
// ============================================

// Validate validates the Cluster struct
func (c *Cluster) Validate() error {
	if c.Name == "" {
		return errors.New("name is required")
	}
	if c.APIServerURL == "" {
		return errors.New("api_server_url is required")
	}
	if !isValidClusterType(c.ClusterType) {
		return errors.New("invalid cluster_type")
	}
	if !isValidEnvironment(c.Environment) {
		return errors.New("invalid environment")
	}
	return nil
}

// Validate validates the Namespace struct
func (n *Namespace) Validate() error {
	if n.ClusterID == uuid.Nil {
		return errors.New("cluster_id is required")
	}
	if n.Name == "" {
		return errors.New("name is required")
	}
	if n.Criticality != "" && !isValidCriticality(n.Criticality) {
		return errors.New("invalid criticality")
	}
	return nil
}

// Validate validates the User struct
func (u *User) Validate() error {
	if u.OrganizationID == uuid.Nil {
		return errors.New("organization_id is required")
	}
	if u.Email == "" {
		return errors.New("email is required")
	}
	if !emailRegex.MatchString(u.Email) {
		return errors.New("invalid email format")
	}
	if u.Role != "" && !isValidRole(u.Role) {
		return errors.New("invalid role")
	}
	return nil
}

// Validate validates the Team struct
func (t *Team) Validate() error {
	if t.OrganizationID == uuid.Nil {
		return errors.New("organization_id is required")
	}
	if t.Name == "" {
		return errors.New("name is required")
	}
	if t.Slug == "" {
		return errors.New("slug is required")
	}
	return nil
}

// Helper validation functions
func isValidClusterType(t string) bool {
	switch t {
	case "kubernetes", "openshift", "rke2", "eks", "aks", "gke":
		return true
	}
	return false
}

func isValidEnvironment(e string) bool {
	switch e {
	case "production", "staging", "development", "test":
		return true
	}
	return false
}

func isValidCriticality(c string) bool {
	switch c {
	case "tier-1", "tier-2", "tier-3":
		return true
	}
	return false
}

func isValidRole(r string) bool {
	switch r {
	case "admin", "editor", "viewer":
		return true
	}
	return false
}

// ============================================
// Response DTOs for JSON Serialization
// ============================================

// TeamResponse is the JSON response for Team
type TeamResponse struct {
	ID             uuid.UUID  `json:"id"`
	OrganizationID uuid.UUID  `json:"organization_id"`
	Name           string     `json:"name"`
	Slug           string     `json:"slug"`
	Description    *string    `json:"description,omitempty"`
	ParentID       *uuid.UUID `json:"parent_id,omitempty"`
	TeamType       string     `json:"team_type"`
	ContactEmail   *string    `json:"contact_email,omitempty"`
	ContactSlack   *string    `json:"contact_slack,omitempty"`
	MemberCount    int        `json:"member_count"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

// ToResponse converts Team to TeamResponse
func (t *Team) ToResponse() TeamResponse {
	return TeamResponse{
		ID:             t.ID,
		OrganizationID: t.OrganizationID,
		Name:           t.Name,
		Slug:           t.Slug,
		Description:    t.Description.Ptr(),
		ParentID:       t.ParentID,
		TeamType:       t.TeamType,
		ContactEmail:   t.ContactEmail.Ptr(),
		ContactSlack:   t.ContactSlack.Ptr(),
		MemberCount:    t.MemberCount,
		CreatedAt:      t.CreatedAt,
		UpdatedAt:      t.UpdatedAt,
	}
}

// TeamsToResponse converts a slice of Team to TeamResponse
func TeamsToResponse(teams []Team) []TeamResponse {
	result := make([]TeamResponse, len(teams))
	for i := range teams {
		result[i] = teams[i].ToResponse()
	}
	return result
}

// BusinessUnitResponse is the JSON response for BusinessUnit
type BusinessUnitResponse struct {
	ID             uuid.UUID  `json:"id"`
	OrganizationID uuid.UUID  `json:"organization_id"`
	Name           string     `json:"name"`
	Code           *string    `json:"code,omitempty"`
	Description    *string    `json:"description,omitempty"`
	DirectorName   *string    `json:"director_name,omitempty"`
	DirectorEmail  *string    `json:"director_email,omitempty"`
	CostCenter     *string    `json:"cost_center,omitempty"`
	ParentID       *uuid.UUID `json:"parent_id,omitempty"`
	NamespaceCount int        `json:"namespace_count,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

// ToResponse converts BusinessUnit to BusinessUnitResponse
func (b *BusinessUnit) ToResponse() BusinessUnitResponse {
	return BusinessUnitResponse{
		ID:             b.ID,
		OrganizationID: b.OrganizationID,
		Name:           b.Name,
		Code:           b.Code.Ptr(),
		Description:    b.Description.Ptr(),
		DirectorName:   b.DirectorName.Ptr(),
		DirectorEmail:  b.DirectorEmail.Ptr(),
		CostCenter:     b.CostCenter.Ptr(),
		ParentID:       b.ParentID,
		CreatedAt:      b.CreatedAt,
		UpdatedAt:      b.UpdatedAt,
	}
}

// BusinessUnitsToResponse converts a slice of BusinessUnit to BusinessUnitResponse
func BusinessUnitsToResponse(units []BusinessUnit) []BusinessUnitResponse {
	result := make([]BusinessUnitResponse, len(units))
	for i := range units {
		result[i] = units[i].ToResponse()
	}
	return result
}
