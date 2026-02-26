package services

import (
	"context"
	"database/sql"
	"reflect"

	"github.com/google/uuid"
	"github.com/kubeatlas/kubeatlas/internal/database/repositories"
	"github.com/kubeatlas/kubeatlas/internal/models"
	"go.uber.org/zap"
)

type AuditService struct {
	repo   *repositories.AuditRepository
	logger *zap.SugaredLogger
}

func NewAuditService(repo *repositories.AuditRepository, logger *zap.SugaredLogger) *AuditService {
	return &AuditService{repo: repo, logger: logger}
}

// AuditContext holds context for audit logging
type AuditContext struct {
	UserID    *uuid.UUID
	UserEmail string
	UserIP    string
	UserAgent string
	OrgID     uuid.UUID
}

// LogCreate logs a create action
func (s *AuditService) LogCreate(ctx context.Context, ac AuditContext, resourceType string, resourceID uuid.UUID, resourceName string, newValues map[string]interface{}) {
	s.log(ctx, ac, "create", resourceType, resourceID, resourceName, nil, newValues, nil, "Created "+resourceType)
}

// LogUpdate logs an update action with diff
func (s *AuditService) LogUpdate(ctx context.Context, ac AuditContext, resourceType string, resourceID uuid.UUID, resourceName string, oldValues, newValues map[string]interface{}) {
	changedFields := s.getChangedFields(oldValues, newValues)
	if len(changedFields) == 0 {
		return // No changes
	}
	s.log(ctx, ac, "update", resourceType, resourceID, resourceName, oldValues, newValues, changedFields, "Updated "+resourceType)
}

// LogDelete logs a delete action
func (s *AuditService) LogDelete(ctx context.Context, ac AuditContext, resourceType string, resourceID uuid.UUID, resourceName string) {
	s.log(ctx, ac, "delete", resourceType, resourceID, resourceName, nil, nil, nil, "Deleted "+resourceType)
}

// LogAction logs a custom action
func (s *AuditService) LogAction(ctx context.Context, ac AuditContext, action, resourceType string, resourceID uuid.UUID, resourceName, description string) {
	s.log(ctx, ac, action, resourceType, resourceID, resourceName, nil, nil, nil, description)
}

func (s *AuditService) log(ctx context.Context, ac AuditContext, action, resourceType string, resourceID uuid.UUID, resourceName string, oldValues, newValues map[string]interface{}, changedFields []string, description string) {
	log := &models.AuditLog{
		OrganizationID: ac.OrgID,
		UserID:         ac.UserID,
		Action:         action,
		ResourceType:   resourceType,
		ResourceID:     resourceID,
		OldValues:      oldValues,
		NewValues:      newValues,
		ChangedFields:  changedFields,
	}

	if ac.UserEmail != "" {
		log.UserEmail = sql.NullString{String: ac.UserEmail, Valid: true}
	}
	if ac.UserIP != "" {
		log.UserIP = sql.NullString{String: ac.UserIP, Valid: true}
	}
	if ac.UserAgent != "" {
		log.UserAgent = sql.NullString{String: ac.UserAgent, Valid: true}
	}
	if resourceName != "" {
		log.ResourceName = sql.NullString{String: resourceName, Valid: true}
	}
	if description != "" {
		log.Description = sql.NullString{String: description, Valid: true}
	}

	if err := s.repo.Create(ctx, log); err != nil {
		s.logger.Errorw("Failed to create audit log", "error", err, "action", action, "resource", resourceType)
	}
}

func (s *AuditService) getChangedFields(oldValues, newValues map[string]interface{}) []string {
	var changed []string
	for key, newVal := range newValues {
		oldVal, exists := oldValues[key]
		if !exists || !reflect.DeepEqual(oldVal, newVal) {
			changed = append(changed, key)
		}
	}
	return changed
}

// List retrieves audit logs with pagination
func (s *AuditService) List(ctx context.Context, orgID uuid.UUID, p repositories.Pagination, filters map[string]interface{}) (*repositories.PaginatedResult[models.AuditLog], error) {
	return s.repo.List(ctx, orgID, p, filters)
}

// ListByResource retrieves audit logs for a specific resource
func (s *AuditService) ListByResource(ctx context.Context, resourceType string, resourceID uuid.UUID, limit int) ([]models.AuditLog, error) {
	return s.repo.ListByResource(ctx, resourceType, resourceID, limit)
}

// GetRecentActivities retrieves recent activities for dashboard
func (s *AuditService) GetRecentActivities(ctx context.Context, orgID uuid.UUID, limit int) ([]models.AuditLog, error) {
	return s.repo.GetRecentActivities(ctx, orgID, limit)
}

// StructToMap converts a struct to map for audit logging
func StructToMap(obj interface{}) map[string]interface{} {
	result := make(map[string]interface{})
	val := reflect.ValueOf(obj)
	
	if val.Kind() == reflect.Ptr {
		val = val.Elem()
	}
	
	if val.Kind() != reflect.Struct {
		return result
	}

	typ := val.Type()
	for i := 0; i < val.NumField(); i++ {
		field := typ.Field(i)
		
		// Skip unexported fields
		if field.PkgPath != "" {
			continue
		}
		
		// Get json tag or field name
		name := field.Tag.Get("json")
		if name == "" || name == "-" {
			name = field.Name
		}
		// Remove omitempty suffix
		if idx := len(name) - 1; idx > 0 && name[idx] == ',' {
			name = name[:idx]
		}
		
		result[name] = val.Field(i).Interface()
	}

	return result
}
