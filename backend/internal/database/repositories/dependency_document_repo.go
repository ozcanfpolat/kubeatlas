package repositories

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kubeatlas/kubeatlas/internal/models"
)

// ============================================
// Internal Dependency Repository
// ============================================

// InternalDependencyRepository handles internal dependency database operations
type InternalDependencyRepository struct {
	*BaseRepository
	pool *pgxpool.Pool
}

// NewInternalDependencyRepository creates a new internal dependency repository
func NewInternalDependencyRepository(pool *pgxpool.Pool) *InternalDependencyRepository {
	return &InternalDependencyRepository{
		BaseRepository: NewBaseRepository(pool),
		pool:           pool,
	}
}

// Create creates a new internal dependency
func (r *InternalDependencyRepository) Create(ctx context.Context, dep *models.InternalDependency) error {
	dep.ID = uuid.New()
	dep.CreatedAt = time.Now()
	dep.UpdatedAt = time.Now()

	query := `
		INSERT INTO internal_dependencies (
			id, organization_id,
			source_namespace_id, source_resource_type, source_resource_name,
			target_namespace_id, target_resource_type, target_resource_name,
			dependency_type, description, is_critical,
			is_auto_discovered, discovery_method,
			status, metadata,
			created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
	`

	_, err := r.pool.Exec(ctx, query,
		dep.ID, dep.OrganizationID,
		dep.SourceNamespaceID, dep.SourceResourceType, dep.SourceResourceName,
		dep.TargetNamespaceID, dep.TargetResourceType, dep.TargetResourceName,
		dep.DependencyType, dep.Description, dep.IsCritical,
		dep.IsAutoDiscovered, dep.DiscoveryMethod,
		dep.Status, dep.Metadata,
		dep.CreatedAt, dep.UpdatedAt,
	)

	return err
}

// GetByID retrieves an internal dependency by ID
func (r *InternalDependencyRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.InternalDependency, error) {
	query := `
		SELECT 
			id, organization_id,
			source_namespace_id, source_resource_type, source_resource_name,
			target_namespace_id, target_resource_type, target_resource_name,
			dependency_type, description, is_critical,
			is_auto_discovered, discovery_method,
			status, verified_at, verified_by, metadata,
			created_at, updated_at
		FROM internal_dependencies
		WHERE id = $1 AND deleted_at IS NULL
	`

	dep := &models.InternalDependency{}
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&dep.ID, &dep.OrganizationID,
		&dep.SourceNamespaceID, &dep.SourceResourceType, &dep.SourceResourceName,
		&dep.TargetNamespaceID, &dep.TargetResourceType, &dep.TargetResourceName,
		&dep.DependencyType, &dep.Description, &dep.IsCritical,
		&dep.IsAutoDiscovered, &dep.DiscoveryMethod,
		&dep.Status, &dep.VerifiedAt, &dep.VerifiedBy, &dep.Metadata,
		&dep.CreatedAt, &dep.UpdatedAt,
	)

	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return dep, nil
}

// ListByNamespace retrieves all dependencies for a namespace (both source and target)
func (r *InternalDependencyRepository) ListByNamespace(ctx context.Context, namespaceID uuid.UUID) ([]models.InternalDependency, error) {
	query := `
		SELECT 
			d.id, d.organization_id,
			d.source_namespace_id, d.source_resource_type, d.source_resource_name,
			d.target_namespace_id, d.target_resource_type, d.target_resource_name,
			d.dependency_type, d.description, d.is_critical,
			d.is_auto_discovered, d.discovery_method,
			d.status, d.verified_at, d.verified_by, d.metadata,
			d.created_at, d.updated_at,
			sn.name as source_namespace_name,
			tn.name as target_namespace_name
		FROM internal_dependencies d
		LEFT JOIN namespaces sn ON d.source_namespace_id = sn.id
		LEFT JOIN namespaces tn ON d.target_namespace_id = tn.id
		WHERE (d.source_namespace_id = $1 OR d.target_namespace_id = $1) 
			AND d.deleted_at IS NULL
		ORDER BY d.is_critical DESC, d.dependency_type ASC
	`

	rows, err := r.pool.Query(ctx, query, namespaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var deps []models.InternalDependency
	for rows.Next() {
		var d models.InternalDependency
		var sourceNsName, targetNsName string
		err := rows.Scan(
			&d.ID, &d.OrganizationID,
			&d.SourceNamespaceID, &d.SourceResourceType, &d.SourceResourceName,
			&d.TargetNamespaceID, &d.TargetResourceType, &d.TargetResourceName,
			&d.DependencyType, &d.Description, &d.IsCritical,
			&d.IsAutoDiscovered, &d.DiscoveryMethod,
			&d.Status, &d.VerifiedAt, &d.VerifiedBy, &d.Metadata,
			&d.CreatedAt, &d.UpdatedAt,
			&sourceNsName, &targetNsName,
		)
		if err != nil {
			return nil, err
		}
		// Attach namespace names to metadata for convenience
		d.SourceNamespace = &models.Namespace{BaseModel: models.BaseModel{ID: d.SourceNamespaceID}, Name: sourceNsName}
		d.TargetNamespace = &models.Namespace{BaseModel: models.BaseModel{ID: d.TargetNamespaceID}, Name: targetNsName}
		deps = append(deps, d)
	}

	return deps, nil
}

// List retrieves all internal dependencies for an organization
func (r *InternalDependencyRepository) List(ctx context.Context, orgID uuid.UUID, p Pagination) (*PaginatedResult[models.InternalDependency], error) {
	qb := NewQueryBuilder(`
		SELECT 
			id, organization_id,
			source_namespace_id, source_resource_type, source_resource_name,
			target_namespace_id, target_resource_type, target_resource_name,
			dependency_type, description, is_critical,
			is_auto_discovered, discovery_method,
			status, verified_at, verified_by, metadata,
			created_at, updated_at
		FROM internal_dependencies
	`)

	qb.Where("organization_id = ?", orgID)
	qb.Where("deleted_at IS NULL")
	qb.Paginate(p)

	// Count
	countQuery, countArgs := qb.BuildCount()
	var total int64
	if err := r.pool.QueryRow(ctx, countQuery, countArgs...).Scan(&total); err != nil {
		return nil, err
	}

	// Data
	query, args := qb.Build()
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var deps []models.InternalDependency
	for rows.Next() {
		var d models.InternalDependency
		err := rows.Scan(
			&d.ID, &d.OrganizationID,
			&d.SourceNamespaceID, &d.SourceResourceType, &d.SourceResourceName,
			&d.TargetNamespaceID, &d.TargetResourceType, &d.TargetResourceName,
			&d.DependencyType, &d.Description, &d.IsCritical,
			&d.IsAutoDiscovered, &d.DiscoveryMethod,
			&d.Status, &d.VerifiedAt, &d.VerifiedBy, &d.Metadata,
			&d.CreatedAt, &d.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		deps = append(deps, d)
	}

	totalPages := int(total) / p.PageSize
	if int(total)%p.PageSize > 0 {
		totalPages++
	}

	return &PaginatedResult[models.InternalDependency]{
		Items:      deps,
		Total:      total,
		Page:       p.Page,
		PageSize:   p.PageSize,
		TotalPages: totalPages,
	}, nil
}

// Update updates an internal dependency
func (r *InternalDependencyRepository) Update(ctx context.Context, dep *models.InternalDependency) error {
	dep.UpdatedAt = time.Now()

	query := `
		UPDATE internal_dependencies SET
			source_resource_type = $2, source_resource_name = $3,
			target_resource_type = $4, target_resource_name = $5,
			dependency_type = $6, description = $7, is_critical = $8,
			status = $9, metadata = $10, updated_at = $11
		WHERE id = $1 AND deleted_at IS NULL
	`

	result, err := r.pool.Exec(ctx, query,
		dep.ID,
		dep.SourceResourceType, dep.SourceResourceName,
		dep.TargetResourceType, dep.TargetResourceName,
		dep.DependencyType, dep.Description, dep.IsCritical,
		dep.Status, dep.Metadata, dep.UpdatedAt,
	)

	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}

	return nil
}

// Delete soft deletes an internal dependency
func (r *InternalDependencyRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.SoftDelete(ctx, "internal_dependencies", id)
}

// ============================================
// External Dependency Repository
// ============================================

// ExternalDependencyRepository handles external dependency database operations
type ExternalDependencyRepository struct {
	*BaseRepository
	pool *pgxpool.Pool
}

// NewExternalDependencyRepository creates a new external dependency repository
func NewExternalDependencyRepository(pool *pgxpool.Pool) *ExternalDependencyRepository {
	return &ExternalDependencyRepository{
		BaseRepository: NewBaseRepository(pool),
		pool:           pool,
	}
}

// Create creates a new external dependency
func (r *ExternalDependencyRepository) Create(ctx context.Context, dep *models.ExternalDependency) error {
	dep.ID = uuid.New()
	dep.CreatedAt = time.Now()
	dep.UpdatedAt = time.Now()

	query := `
		INSERT INTO external_dependencies (
			id, organization_id, namespace_id,
			name, system_type, provider, endpoint, description,
			is_critical, expected_availability,
			contact_name, contact_email, documentation_url,
			status, metadata,
			created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
	`

	_, err := r.pool.Exec(ctx, query,
		dep.ID, dep.OrganizationID, dep.NamespaceID,
		dep.Name, dep.SystemType, dep.Provider, dep.Endpoint, dep.Description,
		dep.IsCritical, dep.ExpectedAvailability,
		dep.ContactName, dep.ContactEmail, dep.DocumentationURL,
		dep.Status, dep.Metadata,
		dep.CreatedAt, dep.UpdatedAt,
	)

	return err
}

// GetByID retrieves an external dependency by ID
func (r *ExternalDependencyRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.ExternalDependency, error) {
	query := `
		SELECT 
			id, organization_id, namespace_id,
			name, system_type, provider, endpoint, description,
			is_critical, expected_availability,
			contact_name, contact_email, documentation_url,
			status, metadata,
			created_at, updated_at
		FROM external_dependencies
		WHERE id = $1 AND deleted_at IS NULL
	`

	dep := &models.ExternalDependency{}
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&dep.ID, &dep.OrganizationID, &dep.NamespaceID,
		&dep.Name, &dep.SystemType, &dep.Provider, &dep.Endpoint, &dep.Description,
		&dep.IsCritical, &dep.ExpectedAvailability,
		&dep.ContactName, &dep.ContactEmail, &dep.DocumentationURL,
		&dep.Status, &dep.Metadata,
		&dep.CreatedAt, &dep.UpdatedAt,
	)

	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return dep, nil
}

// ListByNamespace retrieves all external dependencies for a namespace
func (r *ExternalDependencyRepository) ListByNamespace(ctx context.Context, namespaceID uuid.UUID) ([]models.ExternalDependency, error) {
	query := `
		SELECT 
			id, organization_id, namespace_id,
			name, system_type, provider, endpoint, description,
			is_critical, expected_availability,
			contact_name, contact_email, documentation_url,
			status, metadata,
			created_at, updated_at
		FROM external_dependencies
		WHERE namespace_id = $1 AND deleted_at IS NULL
		ORDER BY is_critical DESC, name ASC
	`

	rows, err := r.pool.Query(ctx, query, namespaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var deps []models.ExternalDependency
	for rows.Next() {
		var d models.ExternalDependency
		err := rows.Scan(
			&d.ID, &d.OrganizationID, &d.NamespaceID,
			&d.Name, &d.SystemType, &d.Provider, &d.Endpoint, &d.Description,
			&d.IsCritical, &d.ExpectedAvailability,
			&d.ContactName, &d.ContactEmail, &d.DocumentationURL,
			&d.Status, &d.Metadata,
			&d.CreatedAt, &d.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		deps = append(deps, d)
	}

	return deps, nil
}

// Update updates an external dependency
func (r *ExternalDependencyRepository) Update(ctx context.Context, dep *models.ExternalDependency) error {
	dep.UpdatedAt = time.Now()

	query := `
		UPDATE external_dependencies SET
			name = $2, system_type = $3, provider = $4, endpoint = $5, description = $6,
			is_critical = $7, expected_availability = $8,
			contact_name = $9, contact_email = $10, documentation_url = $11,
			status = $12, metadata = $13, updated_at = $14
		WHERE id = $1 AND deleted_at IS NULL
	`

	result, err := r.pool.Exec(ctx, query,
		dep.ID,
		dep.Name, dep.SystemType, dep.Provider, dep.Endpoint, dep.Description,
		dep.IsCritical, dep.ExpectedAvailability,
		dep.ContactName, dep.ContactEmail, dep.DocumentationURL,
		dep.Status, dep.Metadata, dep.UpdatedAt,
	)

	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}

	return nil
}

// Delete soft deletes an external dependency
func (r *ExternalDependencyRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.SoftDelete(ctx, "external_dependencies", id)
}

// ============================================
// Document Repository
// ============================================

// DocumentRepository handles document database operations
type DocumentRepository struct {
	*BaseRepository
	pool *pgxpool.Pool
}

// NewDocumentRepository creates a new document repository
func NewDocumentRepository(pool *pgxpool.Pool) *DocumentRepository {
	return &DocumentRepository{
		BaseRepository: NewBaseRepository(pool),
		pool:           pool,
	}
}

// Create creates a new document
func (r *DocumentRepository) Create(ctx context.Context, doc *models.Document) error {
	doc.ID = uuid.New()
	doc.CreatedAt = time.Now()
	doc.UpdatedAt = time.Now()
	doc.UploadedAt = time.Now()

	query := `
		INSERT INTO documents (
			id, organization_id, namespace_id, cluster_id,
			name, file_name, file_path, file_size, mime_type, checksum,
			category_id, description, tags,
			version, previous_version_id,
			uploaded_by, uploaded_at,
			status, metadata,
			created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
	`

	_, err := r.pool.Exec(ctx, query,
		doc.ID, doc.OrganizationID, doc.NamespaceID, doc.ClusterID,
		doc.Name, doc.FileName, doc.FilePath, doc.FileSize, doc.MimeType, doc.Checksum,
		doc.CategoryID, doc.Description, doc.Tags,
		doc.Version, doc.PreviousVersionID,
		doc.UploadedBy, doc.UploadedAt,
		doc.Status, doc.Metadata,
		doc.CreatedAt, doc.UpdatedAt,
	)

	return err
}

// GetByID retrieves a document by ID
func (r *DocumentRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Document, error) {
	query := `
		SELECT 
			d.id, d.organization_id, d.namespace_id, d.cluster_id,
			d.name, d.file_name, d.file_path, d.file_size, d.mime_type, d.checksum,
			d.category_id, d.description, d.tags,
			d.version, d.previous_version_id,
			d.uploaded_by, d.uploaded_at,
			d.status, d.metadata,
			d.created_at, d.updated_at,
			c.name as category_name, c.slug as category_slug
		FROM documents d
		LEFT JOIN document_categories c ON d.category_id = c.id
		WHERE d.id = $1 AND d.deleted_at IS NULL
	`

	doc := &models.Document{}
	var categoryName, categorySlug *string

	err := r.pool.QueryRow(ctx, query, id).Scan(
		&doc.ID, &doc.OrganizationID, &doc.NamespaceID, &doc.ClusterID,
		&doc.Name, &doc.FileName, &doc.FilePath, &doc.FileSize, &doc.MimeType, &doc.Checksum,
		&doc.CategoryID, &doc.Description, &doc.Tags,
		&doc.Version, &doc.PreviousVersionID,
		&doc.UploadedBy, &doc.UploadedAt,
		&doc.Status, &doc.Metadata,
		&doc.CreatedAt, &doc.UpdatedAt,
		&categoryName, &categorySlug,
	)

	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	if categoryName != nil && doc.CategoryID != nil {
		doc.Category = &models.DocumentCategory{
			ID:   *doc.CategoryID,
			Name: *categoryName,
		}
		if categorySlug != nil {
			doc.Category.Slug = *categorySlug
		}
	}

	return doc, nil
}

// ListByNamespace retrieves all documents for a namespace
func (r *DocumentRepository) ListByNamespace(ctx context.Context, namespaceID uuid.UUID) ([]models.Document, error) {
	query := `
		SELECT 
			d.id, d.organization_id, d.namespace_id, d.cluster_id,
			d.name, d.file_name, d.file_path, d.file_size, d.mime_type, d.checksum,
			d.category_id, d.description, d.tags,
			d.version, d.previous_version_id,
			d.uploaded_by, d.uploaded_at,
			d.status, d.metadata,
			d.created_at, d.updated_at,
			c.name as category_name,
			u.full_name as uploader_name
		FROM documents d
		LEFT JOIN document_categories c ON d.category_id = c.id
		LEFT JOIN users u ON d.uploaded_by = u.id
		WHERE d.namespace_id = $1 AND d.deleted_at IS NULL
		ORDER BY d.uploaded_at DESC
	`

	rows, err := r.pool.Query(ctx, query, namespaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var docs []models.Document
	for rows.Next() {
		var d models.Document
		var categoryName, uploaderName *string

		err := rows.Scan(
			&d.ID, &d.OrganizationID, &d.NamespaceID, &d.ClusterID,
			&d.Name, &d.FileName, &d.FilePath, &d.FileSize, &d.MimeType, &d.Checksum,
			&d.CategoryID, &d.Description, &d.Tags,
			&d.Version, &d.PreviousVersionID,
			&d.UploadedBy, &d.UploadedAt,
			&d.Status, &d.Metadata,
			&d.CreatedAt, &d.UpdatedAt,
			&categoryName, &uploaderName,
		)
		if err != nil {
			return nil, err
		}

		if categoryName != nil && d.CategoryID != nil {
			d.Category = &models.DocumentCategory{ID: *d.CategoryID, Name: *categoryName}
		}
		if uploaderName != nil {
			d.UploadedByUser = &models.User{BaseModel: models.BaseModel{ID: d.UploadedBy}}
			d.UploadedByUser.FullName.String = *uploaderName
			d.UploadedByUser.FullName.Valid = true
		}

		docs = append(docs, d)
	}

	return docs, nil
}

// GetRecent retrieves recent documents for an organization
func (r *DocumentRepository) GetRecent(ctx context.Context, orgID uuid.UUID, limit int) ([]models.Document, error) {
	query := `
		SELECT 
			d.id, d.organization_id, d.namespace_id, d.cluster_id,
			d.name, d.file_name, d.file_size, d.mime_type,
			d.category_id, d.description, d.tags,
			d.uploaded_by, d.uploaded_at,
			d.status,
			n.name as namespace_name,
			u.full_name as uploader_name
		FROM documents d
		LEFT JOIN namespaces n ON d.namespace_id = n.id
		LEFT JOIN users u ON d.uploaded_by = u.id
		WHERE d.organization_id = $1 AND d.deleted_at IS NULL
		ORDER BY d.uploaded_at DESC
		LIMIT $2
	`

	rows, err := r.pool.Query(ctx, query, orgID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var docs []models.Document
	for rows.Next() {
		var d models.Document
		var namespaceName, uploaderName *string

		err := rows.Scan(
			&d.ID, &d.OrganizationID, &d.NamespaceID, &d.ClusterID,
			&d.Name, &d.FileName, &d.FileSize, &d.MimeType,
			&d.CategoryID, &d.Description, &d.Tags,
			&d.UploadedBy, &d.UploadedAt,
			&d.Status,
			&namespaceName, &uploaderName,
		)
		if err != nil {
			return nil, err
		}

		if namespaceName != nil && d.NamespaceID != nil {
			d.Namespace = &models.Namespace{BaseModel: models.BaseModel{ID: *d.NamespaceID}, Name: *namespaceName}
		}
		if uploaderName != nil {
			d.UploadedByUser = &models.User{BaseModel: models.BaseModel{ID: d.UploadedBy}}
			d.UploadedByUser.FullName.String = *uploaderName
			d.UploadedByUser.FullName.Valid = true
		}

		docs = append(docs, d)
	}

	return docs, nil
}

// Update updates a document
func (r *DocumentRepository) Update(ctx context.Context, doc *models.Document) error {
	doc.UpdatedAt = time.Now()

	query := `
		UPDATE documents SET
			name = $2, description = $3, category_id = $4, tags = $5,
			status = $6, metadata = $7, updated_at = $8
		WHERE id = $1 AND deleted_at IS NULL
	`

	result, err := r.pool.Exec(ctx, query,
		doc.ID, doc.Name, doc.Description, doc.CategoryID, doc.Tags,
		doc.Status, doc.Metadata, doc.UpdatedAt,
	)

	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}

	return nil
}

// Delete soft deletes a document
func (r *DocumentRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.SoftDelete(ctx, "documents", id)
}

// GetCategories retrieves all document categories
func (r *DocumentRepository) GetCategories(ctx context.Context, orgID *uuid.UUID) ([]models.DocumentCategory, error) {
	query := `
		SELECT id, organization_id, name, slug, description, color, icon, sort_order
		FROM document_categories
		WHERE organization_id IS NULL OR organization_id = $1
		ORDER BY sort_order ASC
	`

	rows, err := r.pool.Query(ctx, query, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var categories []models.DocumentCategory
	for rows.Next() {
		var c models.DocumentCategory
		err := rows.Scan(
			&c.ID, &c.OrganizationID, &c.Name, &c.Slug,
			&c.Description, &c.Color, &c.Icon, &c.SortOrder,
		)
		if err != nil {
			return nil, err
		}
		categories = append(categories, c)
	}

	return categories, nil
}
