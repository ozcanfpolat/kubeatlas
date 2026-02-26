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

// ClusterRepository handles cluster database operations
type ClusterRepository struct {
	*BaseRepository
	pool *pgxpool.Pool
}

// NewClusterRepository creates a new cluster repository
func NewClusterRepository(pool *pgxpool.Pool) *ClusterRepository {
	return &ClusterRepository{
		BaseRepository: NewBaseRepository(pool),
		pool:           pool,
	}
}

// Create creates a new cluster
func (r *ClusterRepository) Create(ctx context.Context, cluster *models.Cluster) error {
	cluster.ID = uuid.New()
	cluster.CreatedAt = time.Now()
	cluster.UpdatedAt = time.Now()

	query := `
		INSERT INTO clusters (
			id, organization_id, name, display_name, description,
			api_server_url, cluster_type, version, platform, region, environment,
			auth_method, kubeconfig_encrypted, service_account_token_encrypted, skip_tls_verify,
			owner_team_id, responsible_user_id,
			status, node_count, namespace_count,
			tags, labels, annotations, metadata,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9, $10, $11,
			$12, $13, $14, $15,
			$16, $17,
			$18, $19, $20,
			$21, $22, $23, $24,
			$25, $26
		)
	`

	_, err := r.pool.Exec(ctx, query,
		cluster.ID, cluster.OrganizationID, cluster.Name, cluster.DisplayName, cluster.Description,
		cluster.APIServerURL, cluster.ClusterType, cluster.Version, cluster.Platform, cluster.Region, cluster.Environment,
		cluster.AuthMethod, cluster.KubeconfigEncrypted, cluster.ServiceAccountTokenEncrypted, cluster.SkipTLSVerify,
		cluster.OwnerTeamID, cluster.ResponsibleUserID,
		cluster.Status, cluster.NodeCount, cluster.NamespaceCount,
		cluster.Tags, cluster.Labels, cluster.Annotations, cluster.Metadata,
		cluster.CreatedAt, cluster.UpdatedAt,
	)

	return err
}

// GetByID retrieves a cluster by ID
func (r *ClusterRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Cluster, error) {
	query := `
		SELECT 
			id, organization_id, name, display_name, description,
			api_server_url, cluster_type, version, platform, region, environment,
			auth_method, kubeconfig_encrypted, service_account_token_encrypted, skip_tls_verify,
			owner_team_id, responsible_user_id,
			status, last_sync_at, sync_error,
			node_count, namespace_count,
			tags, labels, annotations, metadata,
			created_at, updated_at, deleted_at
		FROM clusters
		WHERE id = $1 AND deleted_at IS NULL
	`

	cluster := &models.Cluster{}
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&cluster.ID, &cluster.OrganizationID, &cluster.Name, &cluster.DisplayName, &cluster.Description,
		&cluster.APIServerURL, &cluster.ClusterType, &cluster.Version, &cluster.Platform, &cluster.Region, &cluster.Environment,
		&cluster.AuthMethod, &cluster.KubeconfigEncrypted, &cluster.ServiceAccountTokenEncrypted, &cluster.SkipTLSVerify,
		&cluster.OwnerTeamID, &cluster.ResponsibleUserID,
		&cluster.Status, &cluster.LastSyncAt, &cluster.SyncError,
		&cluster.NodeCount, &cluster.NamespaceCount,
		&cluster.Tags, &cluster.Labels, &cluster.Annotations, &cluster.Metadata,
		&cluster.CreatedAt, &cluster.UpdatedAt, &cluster.DeletedAt,
	)

	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return cluster, nil
}

// GetByName retrieves a cluster by name within an organization
func (r *ClusterRepository) GetByName(ctx context.Context, orgID uuid.UUID, name string) (*models.Cluster, error) {
	query := `
		SELECT 
			id, organization_id, name, display_name, description,
			api_server_url, cluster_type, version, platform, region, environment,
			auth_method, kubeconfig_encrypted, service_account_token_encrypted, skip_tls_verify,
			owner_team_id, responsible_user_id,
			status, last_sync_at, sync_error,
			node_count, namespace_count,
			tags, labels, annotations, metadata,
			created_at, updated_at, deleted_at
		FROM clusters
		WHERE organization_id = $1 AND name = $2 AND deleted_at IS NULL
	`

	cluster := &models.Cluster{}
	err := r.pool.QueryRow(ctx, query, orgID, name).Scan(
		&cluster.ID, &cluster.OrganizationID, &cluster.Name, &cluster.DisplayName, &cluster.Description,
		&cluster.APIServerURL, &cluster.ClusterType, &cluster.Version, &cluster.Platform, &cluster.Region, &cluster.Environment,
		&cluster.AuthMethod, &cluster.KubeconfigEncrypted, &cluster.ServiceAccountTokenEncrypted, &cluster.SkipTLSVerify,
		&cluster.OwnerTeamID, &cluster.ResponsibleUserID,
		&cluster.Status, &cluster.LastSyncAt, &cluster.SyncError,
		&cluster.NodeCount, &cluster.NamespaceCount,
		&cluster.Tags, &cluster.Labels, &cluster.Annotations, &cluster.Metadata,
		&cluster.CreatedAt, &cluster.UpdatedAt, &cluster.DeletedAt,
	)

	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return cluster, nil
}

// List retrieves clusters with pagination and filters
func (r *ClusterRepository) List(ctx context.Context, orgID uuid.UUID, p Pagination, filters map[string]interface{}) (*PaginatedResult[models.Cluster], error) {
	qb := NewQueryBuilder(`
		SELECT 
			id, organization_id, name, display_name, description,
			api_server_url, cluster_type, version, platform, region, environment,
			auth_method, skip_tls_verify,
			owner_team_id, responsible_user_id,
			status, last_sync_at, sync_error,
			node_count, namespace_count,
			tags, labels, annotations, metadata,
			created_at, updated_at
		FROM clusters
	`)

	qb.Where("organization_id = ?", orgID)
	qb.Where("deleted_at IS NULL")

	// Apply filters
	if status, ok := filters["status"].(string); ok && status != "" {
		qb.Where("status = ?", status)
	}
	if clusterType, ok := filters["cluster_type"].(string); ok && clusterType != "" {
		qb.Where("cluster_type = ?", clusterType)
	}
	if environment, ok := filters["environment"].(string); ok && environment != "" {
		qb.Where("environment = ?", environment)
	}
	if search, ok := filters["search"].(string); ok && search != "" {
		qb.Where("(name ILIKE ? OR display_name ILIKE ?)", "%"+search+"%", "%"+search+"%")
	}

	// Default sort
	if p.Sort == "" {
		p.Sort = "name"
		p.Order = "asc"
	}

	qb.Paginate(p)

	// Get total count
	countQuery, countArgs := qb.BuildCount()
	var total int64
	if err := r.pool.QueryRow(ctx, countQuery, countArgs...).Scan(&total); err != nil {
		return nil, fmt.Errorf("failed to count clusters: %w", err)
	}

	// Get data
	query, args := qb.Build()
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query clusters: %w", err)
	}
	defer rows.Close()

	clusters := make([]models.Cluster, 0)
	for rows.Next() {
		var c models.Cluster
		err := rows.Scan(
			&c.ID, &c.OrganizationID, &c.Name, &c.DisplayName, &c.Description,
			&c.APIServerURL, &c.ClusterType, &c.Version, &c.Platform, &c.Region, &c.Environment,
			&c.AuthMethod, &c.SkipTLSVerify,
			&c.OwnerTeamID, &c.ResponsibleUserID,
			&c.Status, &c.LastSyncAt, &c.SyncError,
			&c.NodeCount, &c.NamespaceCount,
			&c.Tags, &c.Labels, &c.Annotations, &c.Metadata,
			&c.CreatedAt, &c.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan cluster: %w", err)
		}
		clusters = append(clusters, c)
	}

	totalPages := int(total) / p.PageSize
	if int(total)%p.PageSize > 0 {
		totalPages++
	}

	return &PaginatedResult[models.Cluster]{
		Items:      clusters,
		Total:      total,
		Page:       p.Page,
		PageSize:   p.PageSize,
		TotalPages: totalPages,
	}, nil
}

// Update updates a cluster
func (r *ClusterRepository) Update(ctx context.Context, cluster *models.Cluster) error {
	cluster.UpdatedAt = time.Now()

	query := `
		UPDATE clusters SET
			name = $2,
			display_name = $3,
			description = $4,
			api_server_url = $5,
			cluster_type = $6,
			version = $7,
			platform = $8,
			region = $9,
			environment = $10,
			auth_method = $11,
			skip_tls_verify = $12,
			owner_team_id = $13,
			responsible_user_id = $14,
			status = $15,
			tags = $16,
			labels = $17,
			annotations = $18,
			metadata = $19,
			updated_at = $20
		WHERE id = $1 AND deleted_at IS NULL
	`

	result, err := r.pool.Exec(ctx, query,
		cluster.ID,
		cluster.Name,
		cluster.DisplayName,
		cluster.Description,
		cluster.APIServerURL,
		cluster.ClusterType,
		cluster.Version,
		cluster.Platform,
		cluster.Region,
		cluster.Environment,
		cluster.AuthMethod,
		cluster.SkipTLSVerify,
		cluster.OwnerTeamID,
		cluster.ResponsibleUserID,
		cluster.Status,
		cluster.Tags,
		cluster.Labels,
		cluster.Annotations,
		cluster.Metadata,
		cluster.UpdatedAt,
	)

	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}

	return nil
}

// UpdateSyncStatus updates cluster sync status
func (r *ClusterRepository) UpdateSyncStatus(ctx context.Context, id uuid.UUID, status string, syncError string, nodeCount, namespaceCount int) error {
	query := `
		UPDATE clusters SET
			status = $2,
			sync_error = $3,
			last_sync_at = NOW(),
			node_count = $4,
			namespace_count = $5,
			updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL
	`

	_, err := r.pool.Exec(ctx, query, id, status, syncError, nodeCount, namespaceCount)
	return err
}

// Delete soft deletes a cluster
func (r *ClusterRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.SoftDelete(ctx, "clusters", id)
}

// GetStats returns cluster statistics
func (r *ClusterRepository) GetStats(ctx context.Context, orgID uuid.UUID) (map[string]interface{}, error) {
	query := `
		SELECT 
			COUNT(*) as total,
			COUNT(*) FILTER (WHERE status = 'active') as active,
			COUNT(*) FILTER (WHERE status = 'error') as error,
			COALESCE(SUM(node_count), 0) as total_nodes,
			COALESCE(SUM(namespace_count), 0) as total_namespaces
		FROM clusters
		WHERE organization_id = $1 AND deleted_at IS NULL
	`

	var total, active, errorCount, totalNodes, totalNamespaces int64
	err := r.pool.QueryRow(ctx, query, orgID).Scan(&total, &active, &errorCount, &totalNodes, &totalNamespaces)
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"total":            total,
		"active":           active,
		"error":            errorCount,
		"total_nodes":      totalNodes,
		"total_namespaces": totalNamespaces,
	}, nil
}
