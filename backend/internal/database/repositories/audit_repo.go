package repositories

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kubeatlas/kubeatlas/internal/models"
)

// AuditRepository handles audit log database operations
type AuditRepository struct {
	pool *pgxpool.Pool
}

// NewAuditRepository creates a new audit repository
func NewAuditRepository(pool *pgxpool.Pool) *AuditRepository {
	return &AuditRepository{pool: pool}
}

// Create creates a new audit log entry
func (r *AuditRepository) Create(ctx context.Context, log *models.AuditLog) error {
	log.ID = uuid.New()
	log.CreatedAt = time.Now()

	query := `
		INSERT INTO audit_logs (
			id, organization_id,
			user_id, user_email, user_ip, user_agent,
			action, resource_type, resource_id, resource_name,
			old_values, new_values, changed_fields,
			description, metadata,
			created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
	`

	_, err := r.pool.Exec(ctx, query,
		log.ID, log.OrganizationID,
		log.UserID, log.UserEmail, log.UserIP, log.UserAgent,
		log.Action, log.ResourceType, log.ResourceID, log.ResourceName,
		log.OldValues, log.NewValues, log.ChangedFields,
		log.Description, log.Metadata,
		log.CreatedAt,
	)

	return err
}

// List retrieves audit logs with pagination
func (r *AuditRepository) List(ctx context.Context, orgID uuid.UUID, p Pagination, filters map[string]interface{}) (*PaginatedResult[models.AuditLog], error) {
	qb := NewQueryBuilder(`
		SELECT 
			a.id, a.organization_id,
			a.user_id, a.user_email, a.user_ip, a.user_agent,
			a.action, a.resource_type, a.resource_id, a.resource_name,
			a.old_values, a.new_values, a.changed_fields,
			a.description, a.metadata,
			a.created_at,
			u.full_name as user_name
		FROM audit_logs a
		LEFT JOIN users u ON a.user_id = u.id
	`)

	qb.Where("a.organization_id = ?", orgID)

	// Apply filters
	if action, ok := filters["action"].(string); ok && action != "" {
		qb.Where("a.action = ?", action)
	}
	if resourceType, ok := filters["resource_type"].(string); ok && resourceType != "" {
		qb.Where("a.resource_type = ?", resourceType)
	}
	if resourceID, ok := filters["resource_id"].(uuid.UUID); ok {
		qb.Where("a.resource_id = ?", resourceID)
	}
	if userID, ok := filters["user_id"].(uuid.UUID); ok {
		qb.Where("a.user_id = ?", userID)
	}
	if from, ok := filters["from"].(time.Time); ok {
		qb.Where("a.created_at >= ?", from)
	}
	if to, ok := filters["to"].(time.Time); ok {
		qb.Where("a.created_at <= ?", to)
	}

	// Default sort: newest first
	if p.Sort == "" {
		p.Sort = "a.created_at"
		p.Order = "desc"
	}
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

	var logs []models.AuditLog
	for rows.Next() {
		var l models.AuditLog
		var userName *string

		err := rows.Scan(
			&l.ID, &l.OrganizationID,
			&l.UserID, &l.UserEmail, &l.UserIP, &l.UserAgent,
			&l.Action, &l.ResourceType, &l.ResourceID, &l.ResourceName,
			&l.OldValues, &l.NewValues, &l.ChangedFields,
			&l.Description, &l.Metadata,
			&l.CreatedAt,
			&userName,
		)
		if err != nil {
			return nil, err
		}

		if userName != nil && l.UserID != nil {
			l.User = &models.User{BaseModel: models.BaseModel{ID: *l.UserID}}
			l.User.FullName.String = *userName
			l.User.FullName.Valid = true
		}

		logs = append(logs, l)
	}

	totalPages := int(total) / p.PageSize
	if int(total)%p.PageSize > 0 {
		totalPages++
	}

	return &PaginatedResult[models.AuditLog]{
		Items:      logs,
		Total:      total,
		Page:       p.Page,
		PageSize:   p.PageSize,
		TotalPages: totalPages,
	}, nil
}

// ListByResource retrieves audit logs for a specific resource
func (r *AuditRepository) ListByResource(ctx context.Context, resourceType string, resourceID uuid.UUID, limit int) ([]models.AuditLog, error) {
	query := `
		SELECT 
			a.id, a.organization_id,
			a.user_id, a.user_email, a.user_ip, a.user_agent,
			a.action, a.resource_type, a.resource_id, a.resource_name,
			a.old_values, a.new_values, a.changed_fields,
			a.description, a.metadata,
			a.created_at,
			u.full_name as user_name
		FROM audit_logs a
		LEFT JOIN users u ON a.user_id = u.id
		WHERE a.resource_type = $1 AND a.resource_id = $2
		ORDER BY a.created_at DESC
		LIMIT $3
	`

	rows, err := r.pool.Query(ctx, query, resourceType, resourceID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []models.AuditLog
	for rows.Next() {
		var l models.AuditLog
		var userName *string

		err := rows.Scan(
			&l.ID, &l.OrganizationID,
			&l.UserID, &l.UserEmail, &l.UserIP, &l.UserAgent,
			&l.Action, &l.ResourceType, &l.ResourceID, &l.ResourceName,
			&l.OldValues, &l.NewValues, &l.ChangedFields,
			&l.Description, &l.Metadata,
			&l.CreatedAt,
			&userName,
		)
		if err != nil {
			return nil, err
		}

		if userName != nil && l.UserID != nil {
			l.User = &models.User{BaseModel: models.BaseModel{ID: *l.UserID}}
			l.User.FullName.String = *userName
			l.User.FullName.Valid = true
		}

		logs = append(logs, l)
	}

	return logs, nil
}

// GetRecentActivities retrieves recent activities for dashboard
func (r *AuditRepository) GetRecentActivities(ctx context.Context, orgID uuid.UUID, limit int) ([]models.AuditLog, error) {
	query := `
		SELECT 
			a.id, a.organization_id,
			a.user_id, a.user_email,
			a.action, a.resource_type, a.resource_id, a.resource_name,
			a.description,
			a.created_at,
			u.full_name as user_name
		FROM audit_logs a
		LEFT JOIN users u ON a.user_id = u.id
		WHERE a.organization_id = $1
		ORDER BY a.created_at DESC
		LIMIT $2
	`

	rows, err := r.pool.Query(ctx, query, orgID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []models.AuditLog
	for rows.Next() {
		var l models.AuditLog
		var userName *string

		err := rows.Scan(
			&l.ID, &l.OrganizationID,
			&l.UserID, &l.UserEmail,
			&l.Action, &l.ResourceType, &l.ResourceID, &l.ResourceName,
			&l.Description,
			&l.CreatedAt,
			&userName,
		)
		if err != nil {
			return nil, err
		}

		if userName != nil && l.UserID != nil {
			l.User = &models.User{BaseModel: models.BaseModel{ID: *l.UserID}}
			l.User.FullName.String = *userName
			l.User.FullName.Valid = true
		}

		logs = append(logs, l)
	}

	return logs, nil
}
