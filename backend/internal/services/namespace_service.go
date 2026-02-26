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

var (
	ErrNamespaceNotFound = errors.New("namespace not found")
)

type NamespaceService struct {
	namespaceRepo *repositories.NamespaceRepository
	clusterRepo   *repositories.ClusterRepository
	auditSvc      *AuditService
	logger        *zap.SugaredLogger
}

func NewNamespaceService(
	namespaceRepo *repositories.NamespaceRepository,
	clusterRepo *repositories.ClusterRepository,
	auditSvc *AuditService,
	logger *zap.SugaredLogger,
) *NamespaceService {
	return &NamespaceService{
		namespaceRepo: namespaceRepo,
		clusterRepo:   clusterRepo,
		auditSvc:      auditSvc,
		logger:        logger,
	}
}

// GetByID retrieves a namespace by ID
func (s *NamespaceService) GetByID(ctx context.Context, id uuid.UUID) (*models.Namespace, error) {
	ns, err := s.namespaceRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if ns == nil {
		return nil, ErrNamespaceNotFound
	}
	return ns, nil
}

// List retrieves namespaces with pagination
func (s *NamespaceService) List(ctx context.Context, orgID uuid.UUID, p repositories.Pagination, filters map[string]interface{}) (*repositories.PaginatedResult[models.Namespace], error) {
	return s.namespaceRepo.List(ctx, orgID, p, filters)
}

// UpdateNamespaceRequest represents namespace update data
type UpdateNamespaceRequest struct {
	DisplayName       string     `json:"display_name"`
	Description       string     `json:"description"`
	Environment       string     `json:"environment"`
	Criticality       string     `json:"criticality"`
	
	// Ownership
	InfrastructureOwnerTeamID *uuid.UUID `json:"infrastructure_owner_team_id"`
	InfrastructureOwnerUserID *uuid.UUID `json:"infrastructure_owner_user_id"`
	BusinessUnitID            *uuid.UUID `json:"business_unit_id"`
	
	// Application Manager
	ApplicationManagerName  string `json:"application_manager_name"`
	ApplicationManagerEmail string `json:"application_manager_email"`
	ApplicationManagerPhone string `json:"application_manager_phone"`
	
	// Technical Lead
	TechnicalLeadName  string `json:"technical_lead_name"`
	TechnicalLeadEmail string `json:"technical_lead_email"`
	
	// Project Manager
	ProjectManagerName  string `json:"project_manager_name"`
	ProjectManagerEmail string `json:"project_manager_email"`
	
	// SLA
	SLAAvailability string `json:"sla_availability"`
	SLARTO          string `json:"sla_rto"`
	SLARPO          string `json:"sla_rpo"`
	SupportHours    string `json:"support_hours"`
	EscalationPath  string `json:"escalation_path"`
	
	// Tags
	Tags []string `json:"tags"`
}

// Update updates a namespace
func (s *NamespaceService) Update(ctx context.Context, ac AuditContext, id uuid.UUID, req UpdateNamespaceRequest) (*models.Namespace, error) {
	ns, err := s.namespaceRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if ns == nil {
		return nil, ErrNamespaceNotFound
	}

	oldValues := StructToMap(ns)

	// Apply updates
	if req.DisplayName != "" {
		ns.DisplayName = sql.NullString{String: req.DisplayName, Valid: true}
	}
	if req.Description != "" {
		ns.Description = sql.NullString{String: req.Description, Valid: true}
	}
	if req.Environment != "" {
		ns.Environment = req.Environment
	}
	if req.Criticality != "" {
		ns.Criticality = req.Criticality
	}

	// Ownership
	if req.InfrastructureOwnerTeamID != nil {
		ns.InfrastructureOwnerTeamID = req.InfrastructureOwnerTeamID
	}
	if req.InfrastructureOwnerUserID != nil {
		ns.InfrastructureOwnerUserID = req.InfrastructureOwnerUserID
	}
	if req.BusinessUnitID != nil {
		ns.BusinessUnitID = req.BusinessUnitID
	}

	// Application Manager
	if req.ApplicationManagerName != "" {
		ns.ApplicationManagerName = sql.NullString{String: req.ApplicationManagerName, Valid: true}
	}
	if req.ApplicationManagerEmail != "" {
		ns.ApplicationManagerEmail = sql.NullString{String: req.ApplicationManagerEmail, Valid: true}
	}
	if req.ApplicationManagerPhone != "" {
		ns.ApplicationManagerPhone = sql.NullString{String: req.ApplicationManagerPhone, Valid: true}
	}

	// Technical Lead
	if req.TechnicalLeadName != "" {
		ns.TechnicalLeadName = sql.NullString{String: req.TechnicalLeadName, Valid: true}
	}
	if req.TechnicalLeadEmail != "" {
		ns.TechnicalLeadEmail = sql.NullString{String: req.TechnicalLeadEmail, Valid: true}
	}

	// Project Manager
	if req.ProjectManagerName != "" {
		ns.ProjectManagerName = sql.NullString{String: req.ProjectManagerName, Valid: true}
	}
	if req.ProjectManagerEmail != "" {
		ns.ProjectManagerEmail = sql.NullString{String: req.ProjectManagerEmail, Valid: true}
	}

	// SLA
	if req.SLAAvailability != "" {
		ns.SLAAvailability = sql.NullString{String: req.SLAAvailability, Valid: true}
	}
	if req.SLARTO != "" {
		ns.SLARTO = sql.NullString{String: req.SLARTO, Valid: true}
	}
	if req.SLARPO != "" {
		ns.SLARPO = sql.NullString{String: req.SLARPO, Valid: true}
	}
	if req.SupportHours != "" {
		ns.SupportHours = sql.NullString{String: req.SupportHours, Valid: true}
	}
	if req.EscalationPath != "" {
		ns.EscalationPath = sql.NullString{String: req.EscalationPath, Valid: true}
	}

	// Tags
	if req.Tags != nil {
		ns.Tags = req.Tags
	}

	if err := s.namespaceRepo.Update(ctx, ns); err != nil {
		return nil, err
	}

	s.auditSvc.LogUpdate(ctx, ac, "namespace", ns.ID, ns.Name, oldValues, StructToMap(ns))
	s.logger.Infow("Namespace updated", "namespace_id", ns.ID, "name", ns.Name)

	return ns, nil
}

// AddTag adds a tag to namespace
func (s *NamespaceService) AddTag(ctx context.Context, ac AuditContext, id uuid.UUID, tag string) error {
	ns, err := s.namespaceRepo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if ns == nil {
		return ErrNamespaceNotFound
	}

	// Check if tag already exists
	for _, t := range ns.Tags {
		if t == tag {
			return nil
		}
	}

	oldTags := ns.Tags
	ns.Tags = append(ns.Tags, tag)

	if err := s.namespaceRepo.Update(ctx, ns); err != nil {
		return err
	}

	s.auditSvc.LogUpdate(ctx, ac, "namespace", ns.ID, ns.Name,
		map[string]interface{}{"tags": oldTags},
		map[string]interface{}{"tags": ns.Tags})

	return nil
}

// RemoveTag removes a tag from namespace
func (s *NamespaceService) RemoveTag(ctx context.Context, ac AuditContext, id uuid.UUID, tag string) error {
	ns, err := s.namespaceRepo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if ns == nil {
		return ErrNamespaceNotFound
	}

	oldTags := ns.Tags
	newTags := make([]string, 0)
	for _, t := range ns.Tags {
		if t != tag {
			newTags = append(newTags, t)
		}
	}
	ns.Tags = newTags

	if err := s.namespaceRepo.Update(ctx, ns); err != nil {
		return err
	}

	s.auditSvc.LogUpdate(ctx, ac, "namespace", ns.ID, ns.Name,
		map[string]interface{}{"tags": oldTags},
		map[string]interface{}{"tags": ns.Tags})

	return nil
}

// GetStats returns namespace statistics
func (s *NamespaceService) GetStats(ctx context.Context, orgID uuid.UUID) (*models.DashboardStats, error) {
	return s.namespaceRepo.GetStats(ctx, orgID)
}

// GetEnvironmentDistribution returns namespace distribution by environment
func (s *NamespaceService) GetEnvironmentDistribution(ctx context.Context, orgID uuid.UUID) ([]models.EnvironmentDistribution, error) {
	return s.namespaceRepo.GetEnvironmentDistribution(ctx, orgID)
}

// GetBusinessUnitDistribution returns namespace distribution by business unit
func (s *NamespaceService) GetBusinessUnitDistribution(ctx context.Context, orgID uuid.UUID) ([]models.BusinessUnitDistribution, error) {
	return s.namespaceRepo.GetBusinessUnitDistribution(ctx, orgID)
}

// GetRecentlyUpdated returns recently updated namespaces
func (s *NamespaceService) GetRecentlyUpdated(ctx context.Context, orgID uuid.UUID, limit int) ([]models.Namespace, error) {
	return s.namespaceRepo.GetRecentlyUpdated(ctx, orgID, limit)
}

// GetOrphaned returns namespaces without owner
func (s *NamespaceService) GetOrphaned(ctx context.Context, orgID uuid.UUID, p repositories.Pagination) (*repositories.PaginatedResult[models.Namespace], error) {
	filters := map[string]interface{}{"orphaned": true}
	return s.namespaceRepo.List(ctx, orgID, p, filters)
}

// GetUndocumented returns namespaces without documentation
func (s *NamespaceService) GetUndocumented(ctx context.Context, orgID uuid.UUID, p repositories.Pagination) (*repositories.PaginatedResult[models.Namespace], error) {
	filters := map[string]interface{}{"undocumented": true}
	return s.namespaceRepo.List(ctx, orgID, p, filters)
}

// GetHistory returns namespace audit history
func (s *NamespaceService) GetHistory(ctx context.Context, namespaceID uuid.UUID, limit int) ([]models.AuditLog, error) {
	return s.auditSvc.ListByResource(ctx, "namespace", namespaceID, limit)
}
