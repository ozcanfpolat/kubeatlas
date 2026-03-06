package services

import (
	"context"
	"errors"
	"strings"

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
	result, err := s.namespaceRepo.List(ctx, orgID, p, filters)
	if err != nil {
		return nil, err
	}

	// Populate cluster information for each namespace
	clusterCache := make(map[uuid.UUID]*models.Cluster)
	for i := range result.Items {
		clusterID := result.Items[i].ClusterID
		if clusterID == uuid.Nil {
			continue
		}

		// Check cache first
		if cluster, ok := clusterCache[clusterID]; ok {
			result.Items[i].Cluster = cluster
			continue
		}

		// Fetch cluster
		cluster, err := s.clusterRepo.GetByID(ctx, clusterID)
		if err == nil && cluster != nil {
			clusterCache[clusterID] = cluster
			result.Items[i].Cluster = cluster
		}
	}

	return result, nil
}

// UpdateNamespaceRequest represents namespace update data
type UpdateNamespaceRequest struct {
	DisplayName string `json:"display_name"`
	Description string `json:"description"`
	Environment string `json:"environment"`
	Criticality string `json:"criticality"`

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

	// Ensure Tags, CustomFields, Metadata are not nil (pgx requires non-nil for array/json types)
	if ns.Tags == nil {
		ns.Tags = models.StringArray{}
	}
	if ns.CustomFields == nil {
		ns.CustomFields = make(models.JSONMap)
	}
	if ns.Metadata == nil {
		ns.Metadata = make(models.JSONMap)
	}
	if ns.K8sLabels == nil {
		ns.K8sLabels = make(models.JSONMap)
	}
	if ns.K8sAnnotations == nil {
		ns.K8sAnnotations = make(models.JSONMap)
	}

	// Sanitize existing NullString fields to remove NULL bytes (0x00)
	sanitizeNullString := func(ns *models.NullString) {
		if ns.Valid {
			ns.String = strings.ReplaceAll(ns.String, "\x00", "")
		}
	}
	sanitizeNullString(&ns.DisplayName)
	sanitizeNullString(&ns.Description)
	sanitizeNullString(&ns.K8sUID)
	sanitizeNullString(&ns.ApplicationManagerName)
	sanitizeNullString(&ns.ApplicationManagerEmail)
	sanitizeNullString(&ns.ApplicationManagerPhone)
	sanitizeNullString(&ns.TechnicalLeadName)
	sanitizeNullString(&ns.TechnicalLeadEmail)
	sanitizeNullString(&ns.ProjectManagerName)
	sanitizeNullString(&ns.ProjectManagerEmail)
	sanitizeNullString(&ns.SLAAvailability)
	sanitizeNullString(&ns.SLARTO)
	sanitizeNullString(&ns.SLARPO)
	sanitizeNullString(&ns.SupportHours)
	sanitizeNullString(&ns.EscalationPath)

	oldValues := StructToMap(ns)

	// Apply updates
	if req.DisplayName != "" {
		ns.DisplayName = models.NewNullStringFromString(req.DisplayName)
	}
	if req.Description != "" {
		ns.Description = models.NewNullStringFromString(req.Description)
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
		ns.ApplicationManagerName = models.NewNullStringFromString(req.ApplicationManagerName)
	}
	if req.ApplicationManagerEmail != "" {
		ns.ApplicationManagerEmail = models.NewNullStringFromString(req.ApplicationManagerEmail)
	}
	if req.ApplicationManagerPhone != "" {
		ns.ApplicationManagerPhone = models.NewNullStringFromString(req.ApplicationManagerPhone)
	}

	// Technical Lead
	if req.TechnicalLeadName != "" {
		ns.TechnicalLeadName = models.NewNullStringFromString(req.TechnicalLeadName)
	}
	if req.TechnicalLeadEmail != "" {
		ns.TechnicalLeadEmail = models.NewNullStringFromString(req.TechnicalLeadEmail)
	}

	// Project Manager
	if req.ProjectManagerName != "" {
		ns.ProjectManagerName = models.NewNullStringFromString(req.ProjectManagerName)
	}
	if req.ProjectManagerEmail != "" {
		ns.ProjectManagerEmail = models.NewNullStringFromString(req.ProjectManagerEmail)
	}

	// SLA
	if req.SLAAvailability != "" {
		ns.SLAAvailability = models.NewNullStringFromString(req.SLAAvailability)
	}
	if req.SLARTO != "" {
		ns.SLARTO = models.NewNullStringFromString(req.SLARTO)
	}
	if req.SLARPO != "" {
		ns.SLARPO = models.NewNullStringFromString(req.SLARPO)
	}
	if req.SupportHours != "" {
		ns.SupportHours = models.NewNullStringFromString(req.SupportHours)
	}
	if req.EscalationPath != "" {
		ns.EscalationPath = models.NewNullStringFromString(req.EscalationPath)
	}

	// Tags
	if req.Tags != nil {
		ns.Tags = req.Tags
	}

	// Ensure tags is never nil (StringArray requires non-nil for proper encoding)
	if ns.Tags == nil {
		ns.Tags = []string{}
	}

	// Ensure CustomFields and Metadata are never nil
	if ns.CustomFields == nil {
		ns.CustomFields = make(models.JSONMap)
	}
	if ns.Metadata == nil {
		ns.Metadata = make(models.JSONMap)
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
