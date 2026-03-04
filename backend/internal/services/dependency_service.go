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

// ListInternal returns all internal dependencies for an organization with pagination
func (s *DependencyService) ListInternal(ctx context.Context, orgID uuid.UUID, p repositories.Pagination) (*repositories.PaginatedResult[models.InternalDependency], error) {
	return s.internalRepo.List(ctx, orgID, p)
}

// ListExternal returns all external dependencies for an organization with pagination
func (s *DependencyService) ListExternal(ctx context.Context, orgID uuid.UUID, p repositories.Pagination) (*repositories.PaginatedResult[models.ExternalDependency], error) {
	return s.externalRepo.List(ctx, orgID, p)
}

// GetGraph returns dependency graph for a namespace
func (s *DependencyService) GetGraph(ctx context.Context, namespaceID uuid.UUID) (map[string]interface{}, error) {
	internal, err := s.ListInternalByNamespace(ctx, namespaceID)
	if err != nil {
		return nil, err
	}
	external, err := s.ListExternalByNamespace(ctx, namespaceID)
	if err != nil {
		return nil, err
	}

	// Build nodes and edges for graph visualization
	nodes := make([]map[string]interface{}, 0)
	edges := make([]map[string]interface{}, 0)

	// Add namespace as central node
	nodes = append(nodes, map[string]interface{}{
		"id":   namespaceID.String(),
		"type": "namespace",
	})

	// Add internal dependency edges
	for _, dep := range internal {
		edges = append(edges, map[string]interface{}{
			"id":          dep.ID.String(),
			"source":      dep.SourceNamespaceID.String(),
			"target":      dep.TargetNamespaceID.String(),
			"type":        dep.DependencyType,
			"is_critical": dep.IsCritical,
		})
	}

	// Add external dependencies as nodes and edges
	for _, dep := range external {
		nodes = append(nodes, map[string]interface{}{
			"id":   dep.ID.String(),
			"type": "external",
			"name": dep.Name,
		})
		edges = append(edges, map[string]interface{}{
			"id":          "ext-" + dep.ID.String(),
			"source":      dep.NamespaceID.String(),
			"target":      dep.ID.String(),
			"type":        dep.SystemType,
			"is_critical": dep.IsCritical,
		})
	}

	return map[string]interface{}{
		"nodes": nodes,
		"edges": edges,
	}, nil
}

// GetDependencyMatrix returns a dependency matrix for the organization
func (s *DependencyService) GetDependencyMatrix(ctx context.Context, orgID uuid.UUID) (map[string]interface{}, error) {
	// Get all internal dependencies
	result, err := s.internalRepo.List(ctx, orgID, repositories.Pagination{Page: 1, PageSize: 1000})
	if err != nil {
		return nil, err
	}

	// Build matrix
	matrix := make(map[string][]string)
	for _, dep := range result.Items {
		sourceID := dep.SourceNamespaceID.String()
		targetID := dep.TargetNamespaceID.String()
		if _, ok := matrix[sourceID]; !ok {
			matrix[sourceID] = make([]string, 0)
		}
		matrix[sourceID] = append(matrix[sourceID], targetID)
	}

	return map[string]interface{}{
		"matrix":     matrix,
		"total_deps": result.Total,
	}, nil
}
