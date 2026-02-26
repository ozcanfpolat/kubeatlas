package repositories

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kubeatlas/kubeatlas/internal/models"
)

// NamespaceRepository handles namespace database operations
type NamespaceRepository struct {
	*BaseRepository
	pool *pgxpool.Pool
}

// NewNamespaceRepository creates a new namespace repository
func NewNamespaceRepository(pool *pgxpool.Pool) *NamespaceRepository {
	return &NamespaceRepository{
		BaseRepository: NewBaseRepository(pool),
		pool:           pool,
	}
}

// Create creates a new namespace
func (r *NamespaceRepository) Create(ctx context.Context, ns *models.Namespace) error {
	ns.ID = uuid.New()
	ns.CreatedAt = time.Now()
	ns.UpdatedAt = time.Now()

	query := `
		INSERT INTO namespaces (
			id, organization_id, cluster_id,
			name, display_name, description,
			environment, criticality,
			infrastructure_owner_team_id, infrastructure_owner_user_id,
			business_unit_id,
			application_manager_name, application_manager_email, application_manager_phone,
			technical_lead_name, technical_lead_email,
			project_manager_name, project_manager_email,
			sla_availability, sla_rto, sla_rpo, support_hours, escalation_path,
			status, discovered_at, last_sync_at,
			k8s_uid, k8s_labels, k8s_annotations, k8s_created_at,
			tags, custom_fields, metadata,
			created_at, updated_at
		) VALUES (
			$1, $2, $3,
			$4, $5, $6,
			$7, $8,
			$9, $10,
			$11,
			$12, $13, $14,
			$15, $16,
			$17, $18,
			$19, $20, $21, $22, $23,
			$24, $25, $26,
			$27, $28, $29, $30,
			$31, $32, $33,
			$34, $35
		)
	`

	_, err := r.pool.Exec(ctx, query,
		ns.ID, ns.OrganizationID, ns.ClusterID,
		ns.Name, ns.DisplayName, ns.Description,
		ns.Environment, ns.Criticality,
		ns.InfrastructureOwnerTeamID, ns.InfrastructureOwnerUserID,
		ns.BusinessUnitID,
		ns.ApplicationManagerName, ns.ApplicationManagerEmail, ns.ApplicationManagerPhone,
		ns.TechnicalLeadName, ns.TechnicalLeadEmail,
		ns.ProjectManagerName, ns.ProjectManagerEmail,
		ns.SLAAvailability, ns.SLARTO, ns.SLARPO, ns.SupportHours, ns.EscalationPath,
		ns.Status, ns.DiscoveredAt, ns.LastSyncAt,
		ns.K8sUID, ns.K8sLabels, ns.K8sAnnotations, ns.K8sCreatedAt,
		ns.Tags, ns.CustomFields, ns.Metadata,
		ns.CreatedAt, ns.UpdatedAt,
	)

	return err
}

// GetByID retrieves a namespace by ID with related data
func (r *NamespaceRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Namespace, error) {
	query := `
		SELECT 
			n.id, n.organization_id, n.cluster_id,
			n.name, n.display_name, n.description,
			n.environment, n.criticality,
			n.infrastructure_owner_team_id, n.infrastructure_owner_user_id,
			n.business_unit_id,
			n.application_manager_name, n.application_manager_email, n.application_manager_phone,
			n.technical_lead_name, n.technical_lead_email,
			n.project_manager_name, n.project_manager_email,
			n.sla_availability, n.sla_rto, n.sla_rpo, n.support_hours, n.escalation_path,
			n.status, n.discovered_at, n.last_sync_at,
			n.k8s_uid, n.k8s_labels, n.k8s_annotations, n.k8s_created_at,
			n.tags, n.custom_fields, n.metadata,
			n.created_at, n.updated_at
		FROM namespaces n
		WHERE n.id = $1 AND n.deleted_at IS NULL
	`

	ns := &models.Namespace{}
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&ns.ID, &ns.OrganizationID, &ns.ClusterID,
		&ns.Name, &ns.DisplayName, &ns.Description,
		&ns.Environment, &ns.Criticality,
		&ns.InfrastructureOwnerTeamID, &ns.InfrastructureOwnerUserID,
		&ns.BusinessUnitID,
		&ns.ApplicationManagerName, &ns.ApplicationManagerEmail, &ns.ApplicationManagerPhone,
		&ns.TechnicalLeadName, &ns.TechnicalLeadEmail,
		&ns.ProjectManagerName, &ns.ProjectManagerEmail,
		&ns.SLAAvailability, &ns.SLARTO, &ns.SLARPO, &ns.SupportHours, &ns.EscalationPath,
		&ns.Status, &ns.DiscoveredAt, &ns.LastSyncAt,
		&ns.K8sUID, &ns.K8sLabels, &ns.K8sAnnotations, &ns.K8sCreatedAt,
		&ns.Tags, &ns.CustomFields, &ns.Metadata,
		&ns.CreatedAt, &ns.UpdatedAt,
	)

	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return ns, nil
}

// GetByClusterAndName retrieves a namespace by cluster ID and name
func (r *NamespaceRepository) GetByClusterAndName(ctx context.Context, clusterID uuid.UUID, name string) (*models.Namespace, error) {
	query := `
		SELECT 
			id, organization_id, cluster_id,
			name, display_name, description,
			environment, criticality,
			infrastructure_owner_team_id, infrastructure_owner_user_id,
			business_unit_id,
			application_manager_name, application_manager_email, application_manager_phone,
			technical_lead_name, technical_lead_email,
			project_manager_name, project_manager_email,
			sla_availability, sla_rto, sla_rpo, support_hours, escalation_path,
			status, discovered_at, last_sync_at,
			k8s_uid, k8s_labels, k8s_annotations, k8s_created_at,
			tags, custom_fields, metadata,
			created_at, updated_at
		FROM namespaces
		WHERE cluster_id = $1 AND name = $2 AND deleted_at IS NULL
	`

	ns := &models.Namespace{}
	err := r.pool.QueryRow(ctx, query, clusterID, name).Scan(
		&ns.ID, &ns.OrganizationID, &ns.ClusterID,
		&ns.Name, &ns.DisplayName, &ns.Description,
		&ns.Environment, &ns.Criticality,
		&ns.InfrastructureOwnerTeamID, &ns.InfrastructureOwnerUserID,
		&ns.BusinessUnitID,
		&ns.ApplicationManagerName, &ns.ApplicationManagerEmail, &ns.ApplicationManagerPhone,
		&ns.TechnicalLeadName, &ns.TechnicalLeadEmail,
		&ns.ProjectManagerName, &ns.ProjectManagerEmail,
		&ns.SLAAvailability, &ns.SLARTO, &ns.SLARPO, &ns.SupportHours, &ns.EscalationPath,
		&ns.Status, &ns.DiscoveredAt, &ns.LastSyncAt,
		&ns.K8sUID, &ns.K8sLabels, &ns.K8sAnnotations, &ns.K8sCreatedAt,
		&ns.Tags, &ns.CustomFields, &ns.Metadata,
		&ns.CreatedAt, &ns.UpdatedAt,
	)

	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return ns, nil
}

// List retrieves namespaces with pagination and filters
func (r *NamespaceRepository) List(ctx context.Context, orgID uuid.UUID, p Pagination, filters map[string]interface{}) (*PaginatedResult[models.Namespace], error) {
	qb := NewQueryBuilder(`
		SELECT 
			n.id, n.organization_id, n.cluster_id,
			n.name, n.display_name, n.description,
			n.environment, n.criticality,
			n.infrastructure_owner_team_id, n.infrastructure_owner_user_id,
			n.business_unit_id,
			n.application_manager_name, n.application_manager_email, n.application_manager_phone,
			n.technical_lead_name, n.technical_lead_email,
			n.project_manager_name, n.project_manager_email,
			n.sla_availability, n.sla_rto, n.sla_rpo, n.support_hours, n.escalation_path,
			n.status, n.discovered_at, n.last_sync_at,
			n.k8s_uid, n.k8s_labels, n.k8s_annotations, n.k8s_created_at,
			n.tags, n.custom_fields, n.metadata,
			n.created_at, n.updated_at
		FROM namespaces n
	`)

	qb.Where("n.organization_id = ?", orgID)
	qb.Where("n.deleted_at IS NULL")

	// Apply filters
	if clusterID, ok := filters["cluster_id"].(uuid.UUID); ok {
		qb.Where("n.cluster_id = ?", clusterID)
	}
	if environment, ok := filters["environment"].(string); ok && environment != "" {
		qb.Where("n.environment = ?", environment)
	}
	if criticality, ok := filters["criticality"].(string); ok && criticality != "" {
		qb.Where("n.criticality = ?", criticality)
	}
	if status, ok := filters["status"].(string); ok && status != "" {
		qb.Where("n.status = ?", status)
	}
	if businessUnitID, ok := filters["business_unit_id"].(uuid.UUID); ok {
		qb.Where("n.business_unit_id = ?", businessUnitID)
	}
	if teamID, ok := filters["team_id"].(uuid.UUID); ok {
		qb.Where("n.infrastructure_owner_team_id = ?", teamID)
	}
	if search, ok := filters["search"].(string); ok && search != "" {
		qb.Where("(n.name ILIKE ? OR n.display_name ILIKE ? OR n.description ILIKE ?)", 
			"%"+search+"%", "%"+search+"%", "%"+search+"%")
	}
	
	// Filter for orphaned (no owner)
	if orphaned, ok := filters["orphaned"].(bool); ok && orphaned {
		qb.Where("n.infrastructure_owner_team_id IS NULL")
	}
	
	// Filter for undocumented
	if undocumented, ok := filters["undocumented"].(bool); ok && undocumented {
		qb.Where(`NOT EXISTS (
			SELECT 1 FROM documents d 
			WHERE d.namespace_id = n.id AND d.deleted_at IS NULL
		)`)
	}

	// Default sort
	if p.Sort == "" {
		p.Sort = "n.name"
		p.Order = "asc"
	}

	qb.Paginate(p)

	// Get total count
	countQuery, countArgs := qb.BuildCount()
	var total int64
	if err := r.pool.QueryRow(ctx, countQuery, countArgs...).Scan(&total); err != nil {
		return nil, fmt.Errorf("failed to count namespaces: %w", err)
	}

	// Get data
	query, args := qb.Build()
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query namespaces: %w", err)
	}
	defer rows.Close()

	namespaces := make([]models.Namespace, 0)
	for rows.Next() {
		var ns models.Namespace
		err := rows.Scan(
			&ns.ID, &ns.OrganizationID, &ns.ClusterID,
			&ns.Name, &ns.DisplayName, &ns.Description,
			&ns.Environment, &ns.Criticality,
			&ns.InfrastructureOwnerTeamID, &ns.InfrastructureOwnerUserID,
			&ns.BusinessUnitID,
			&ns.ApplicationManagerName, &ns.ApplicationManagerEmail, &ns.ApplicationManagerPhone,
			&ns.TechnicalLeadName, &ns.TechnicalLeadEmail,
			&ns.ProjectManagerName, &ns.ProjectManagerEmail,
			&ns.SLAAvailability, &ns.SLARTO, &ns.SLARPO, &ns.SupportHours, &ns.EscalationPath,
			&ns.Status, &ns.DiscoveredAt, &ns.LastSyncAt,
			&ns.K8sUID, &ns.K8sLabels, &ns.K8sAnnotations, &ns.K8sCreatedAt,
			&ns.Tags, &ns.CustomFields, &ns.Metadata,
			&ns.CreatedAt, &ns.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan namespace: %w", err)
		}
		namespaces = append(namespaces, ns)
	}

	totalPages := int(total) / p.PageSize
	if int(total)%p.PageSize > 0 {
		totalPages++
	}

	return &PaginatedResult[models.Namespace]{
		Items:      namespaces,
		Total:      total,
		Page:       p.Page,
		PageSize:   p.PageSize,
		TotalPages: totalPages,
	}, nil
}

// Update updates a namespace
func (r *NamespaceRepository) Update(ctx context.Context, ns *models.Namespace) error {
	ns.UpdatedAt = time.Now()

	query := `
		UPDATE namespaces SET
			display_name = $2,
			description = $3,
			environment = $4,
			criticality = $5,
			infrastructure_owner_team_id = $6,
			infrastructure_owner_user_id = $7,
			business_unit_id = $8,
			application_manager_name = $9,
			application_manager_email = $10,
			application_manager_phone = $11,
			technical_lead_name = $12,
			technical_lead_email = $13,
			project_manager_name = $14,
			project_manager_email = $15,
			sla_availability = $16,
			sla_rto = $17,
			sla_rpo = $18,
			support_hours = $19,
			escalation_path = $20,
			tags = $21,
			custom_fields = $22,
			metadata = $23,
			updated_at = $24
		WHERE id = $1 AND deleted_at IS NULL
	`

	result, err := r.pool.Exec(ctx, query,
		ns.ID,
		ns.DisplayName,
		ns.Description,
		ns.Environment,
		ns.Criticality,
		ns.InfrastructureOwnerTeamID,
		ns.InfrastructureOwnerUserID,
		ns.BusinessUnitID,
		ns.ApplicationManagerName,
		ns.ApplicationManagerEmail,
		ns.ApplicationManagerPhone,
		ns.TechnicalLeadName,
		ns.TechnicalLeadEmail,
		ns.ProjectManagerName,
		ns.ProjectManagerEmail,
		ns.SLAAvailability,
		ns.SLARTO,
		ns.SLARPO,
		ns.SupportHours,
		ns.EscalationPath,
		ns.Tags,
		ns.CustomFields,
		ns.Metadata,
		ns.UpdatedAt,
	)

	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}

	return nil
}

// UpdateFromK8s updates namespace with Kubernetes metadata
func (r *NamespaceRepository) UpdateFromK8s(ctx context.Context, id uuid.UUID, k8sUID string, labels, annotations map[string]interface{}, k8sCreatedAt time.Time) error {
	query := `
		UPDATE namespaces SET
			k8s_uid = $2,
			k8s_labels = $3,
			k8s_annotations = $4,
			k8s_created_at = $5,
			last_sync_at = NOW(),
			updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL
	`

	_, err := r.pool.Exec(ctx, query, id, k8sUID, labels, annotations, k8sCreatedAt)
	return err
}

// Delete soft deletes a namespace
func (r *NamespaceRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.SoftDelete(ctx, "namespaces", id)
}

// GetStats returns namespace statistics
func (r *NamespaceRepository) GetStats(ctx context.Context, orgID uuid.UUID) (*models.DashboardStats, error) {
	query := `
		SELECT 
			COUNT(*) as total,
			COUNT(*) FILTER (WHERE infrastructure_owner_team_id IS NOT NULL) as with_owner,
			COUNT(*) FILTER (WHERE infrastructure_owner_team_id IS NULL) as orphaned,
			COUNT(*) FILTER (WHERE business_unit_id IS NULL) as no_business_unit,
			(
				SELECT COUNT(DISTINCT namespace_id) 
				FROM documents 
				WHERE organization_id = $1 AND deleted_at IS NULL
			) as documented,
			(
				SELECT COUNT(DISTINCT source_namespace_id) 
				FROM internal_dependencies 
				WHERE organization_id = $1 AND deleted_at IS NULL
			) as with_deps
		FROM namespaces
		WHERE organization_id = $1 AND deleted_at IS NULL
	`

	stats := &models.DashboardStats{}
	var documented, withDeps int
	
	err := r.pool.QueryRow(ctx, query, orgID).Scan(
		&stats.TotalNamespaces,
		&stats.NamespacesWithOwner,
		&stats.OrphanedNamespaces,
		&stats.NoBusinessUnit,
		&documented,
		&withDeps,
	)
	if err != nil {
		return nil, err
	}

	stats.NamespacesDocumented = documented
	stats.NamespacesWithDeps = withDeps
	stats.UndocumentedNamespaces = stats.TotalNamespaces - documented
	stats.NoDepsNamespaces = stats.TotalNamespaces - withDeps

	return stats, nil
}

// GetEnvironmentDistribution returns namespace count by environment
func (r *NamespaceRepository) GetEnvironmentDistribution(ctx context.Context, orgID uuid.UUID) ([]models.EnvironmentDistribution, error) {
	query := `
		SELECT 
			COALESCE(environment, 'unknown') as environment,
			COUNT(*) as count
		FROM namespaces
		WHERE organization_id = $1 AND deleted_at IS NULL
		GROUP BY environment
		ORDER BY count DESC
	`

	rows, err := r.pool.Query(ctx, query, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []models.EnvironmentDistribution
	for rows.Next() {
		var d models.EnvironmentDistribution
		if err := rows.Scan(&d.Environment, &d.Count); err != nil {
			return nil, err
		}
		result = append(result, d)
	}

	return result, nil
}

// GetBusinessUnitDistribution returns namespace count by business unit
func (r *NamespaceRepository) GetBusinessUnitDistribution(ctx context.Context, orgID uuid.UUID) ([]models.BusinessUnitDistribution, error) {
	query := `
		SELECT 
			n.business_unit_id,
			COALESCE(bu.name, 'Tanımsız') as business_unit_name,
			COUNT(*) as count
		FROM namespaces n
		LEFT JOIN business_units bu ON n.business_unit_id = bu.id
		WHERE n.organization_id = $1 AND n.deleted_at IS NULL
		GROUP BY n.business_unit_id, bu.name
		ORDER BY count DESC
	`

	rows, err := r.pool.Query(ctx, query, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []models.BusinessUnitDistribution
	for rows.Next() {
		var d models.BusinessUnitDistribution
		if err := rows.Scan(&d.BusinessUnitID, &d.BusinessUnitName, &d.Count); err != nil {
			return nil, err
		}
		result = append(result, d)
	}

	return result, nil
}

// GetRecentlyUpdated returns recently updated namespaces
func (r *NamespaceRepository) GetRecentlyUpdated(ctx context.Context, orgID uuid.UUID, limit int) ([]models.Namespace, error) {
	query := `
		SELECT 
			id, organization_id, cluster_id,
			name, display_name, description,
			environment, criticality,
			infrastructure_owner_team_id, infrastructure_owner_user_id,
			business_unit_id,
			application_manager_name, application_manager_email, application_manager_phone,
			technical_lead_name, technical_lead_email,
			project_manager_name, project_manager_email,
			sla_availability, sla_rto, sla_rpo, support_hours, escalation_path,
			status, discovered_at, last_sync_at,
			k8s_uid, k8s_labels, k8s_annotations, k8s_created_at,
			tags, custom_fields, metadata,
			created_at, updated_at
		FROM namespaces
		WHERE organization_id = $1 AND deleted_at IS NULL
		ORDER BY updated_at DESC
		LIMIT $2
	`

	rows, err := r.pool.Query(ctx, query, orgID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var namespaces []models.Namespace
	for rows.Next() {
		var ns models.Namespace
		err := rows.Scan(
			&ns.ID, &ns.OrganizationID, &ns.ClusterID,
			&ns.Name, &ns.DisplayName, &ns.Description,
			&ns.Environment, &ns.Criticality,
			&ns.InfrastructureOwnerTeamID, &ns.InfrastructureOwnerUserID,
			&ns.BusinessUnitID,
			&ns.ApplicationManagerName, &ns.ApplicationManagerEmail, &ns.ApplicationManagerPhone,
			&ns.TechnicalLeadName, &ns.TechnicalLeadEmail,
			&ns.ProjectManagerName, &ns.ProjectManagerEmail,
			&ns.SLAAvailability, &ns.SLARTO, &ns.SLARPO, &ns.SupportHours, &ns.EscalationPath,
			&ns.Status, &ns.DiscoveredAt, &ns.LastSyncAt,
			&ns.K8sUID, &ns.K8sLabels, &ns.K8sAnnotations, &ns.K8sCreatedAt,
			&ns.Tags, &ns.CustomFields, &ns.Metadata,
			&ns.CreatedAt, &ns.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		namespaces = append(namespaces, ns)
	}

	return namespaces, nil
}
