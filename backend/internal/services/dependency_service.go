package services

import (
	"context"
	"database/sql"
	"errors"

	"github.com/google/uuid"
	"github.com/kubeatlas/kubeatlas/internal/database/repositories"
	"github.com/kubeatlas/kubeatlas/internal/models"
	"go.uber.org/zap"
)

var ErrDependencyNotFound = errors.New("dependency not found")

type DependencyService struct {
	internalRepo *repositories.InternalDependencyRepository
	externalRepo *repositories.ExternalDependencyRepository
	auditSvc     *AuditService
	logger       *zap.SugaredLogger
}

func NewDependencyService(internalRepo *repositories.InternalDependencyRepository, externalRepo *repositories.ExternalDependencyRepository, auditSvc *AuditService, logger *zap.SugaredLogger) *DependencyService {
	return &DependencyService{internalRepo: internalRepo, externalRepo: externalRepo, auditSvc: auditSvc, logger: logger}
}

// Internal Dependency
type CreateInternalDependencyRequest struct {
	SourceNamespaceID  uuid.UUID `json:"source_namespace_id" binding:"required"`
	TargetNamespaceID  uuid.UUID `json:"target_namespace_id" binding:"required"`
	DependencyType     string    `json:"dependency_type" binding:"required"`
	Description        string    `json:"description"`
	IsCritical         bool      `json:"is_critical"`
}

func (s *DependencyService) CreateInternal(ctx context.Context, ac AuditContext, req CreateInternalDependencyRequest) (*models.InternalDependency, error) {
	dep := &models.InternalDependency{
		OrganizationID:    ac.OrgID,
		SourceNamespaceID: req.SourceNamespaceID,
		TargetNamespaceID: req.TargetNamespaceID,
		DependencyType:    req.DependencyType,
		IsCritical:        req.IsCritical,
		Status:            "active",
		Metadata:          make(models.JSONMap),
	}
	if req.Description != "" {
		dep.Description = sql.NullString{String: req.Description, Valid: true}
	}

	if err := s.internalRepo.Create(ctx, dep); err != nil {
		return nil, err
	}
	s.auditSvc.LogCreate(ctx, ac, "internal_dependency", dep.ID, req.DependencyType, nil)
	return dep, nil
}

func (s *DependencyService) ListInternalByNamespace(ctx context.Context, namespaceID uuid.UUID) ([]models.InternalDependency, error) {
	return s.internalRepo.ListByNamespace(ctx, namespaceID)
}

func (s *DependencyService) DeleteInternal(ctx context.Context, ac AuditContext, id uuid.UUID) error {
	if err := s.internalRepo.Delete(ctx, id); err != nil {
		return err
	}
	s.auditSvc.LogDelete(ctx, ac, "internal_dependency", id, "")
	return nil
}

// External Dependency
type CreateExternalDependencyRequest struct {
	NamespaceID  uuid.UUID `json:"namespace_id" binding:"required"`
	Name         string    `json:"name" binding:"required"`
	SystemType   string    `json:"system_type" binding:"required"`
	Provider     string    `json:"provider"`
	Endpoint     string    `json:"endpoint"`
	Description  string    `json:"description"`
	IsCritical   bool      `json:"is_critical"`
	ContactName  string    `json:"contact_name"`
	ContactEmail string    `json:"contact_email"`
}

func (s *DependencyService) CreateExternal(ctx context.Context, ac AuditContext, req CreateExternalDependencyRequest) (*models.ExternalDependency, error) {
	dep := &models.ExternalDependency{
		OrganizationID: ac.OrgID,
		NamespaceID:    req.NamespaceID,
		Name:           req.Name,
		SystemType:     req.SystemType,
		IsCritical:     req.IsCritical,
		Status:         "active",
		Metadata:       make(models.JSONMap),
	}
	if req.Provider != "" {
		dep.Provider = sql.NullString{String: req.Provider, Valid: true}
	}
	if req.Endpoint != "" {
		dep.Endpoint = sql.NullString{String: req.Endpoint, Valid: true}
	}
	if req.Description != "" {
		dep.Description = sql.NullString{String: req.Description, Valid: true}
	}
	if req.ContactName != "" {
		dep.ContactName = sql.NullString{String: req.ContactName, Valid: true}
	}
	if req.ContactEmail != "" {
		dep.ContactEmail = sql.NullString{String: req.ContactEmail, Valid: true}
	}

	if err := s.externalRepo.Create(ctx, dep); err != nil {
		return nil, err
	}
	s.auditSvc.LogCreate(ctx, ac, "external_dependency", dep.ID, dep.Name, nil)
	return dep, nil
}

func (s *DependencyService) ListExternalByNamespace(ctx context.Context, namespaceID uuid.UUID) ([]models.ExternalDependency, error) {
	return s.externalRepo.ListByNamespace(ctx, namespaceID)
}

func (s *DependencyService) DeleteExternal(ctx context.Context, ac AuditContext, id uuid.UUID) error {
	if err := s.externalRepo.Delete(ctx, id); err != nil {
		return err
	}
	s.auditSvc.LogDelete(ctx, ac, "external_dependency", id, "")
	return nil
}

func (s *DependencyService) GetAllByNamespace(ctx context.Context, namespaceID uuid.UUID) (map[string]interface{}, error) {
	internal, _ := s.ListInternalByNamespace(ctx, namespaceID)
	external, _ := s.ListExternalByNamespace(ctx, namespaceID)
	return map[string]interface{}{"internal": internal, "external": external}, nil
}
