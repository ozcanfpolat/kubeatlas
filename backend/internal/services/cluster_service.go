package services

import (
	"context"
	"database/sql"
	"errors"

	"github.com/google/uuid"
	"github.com/kubeatlas/kubeatlas/internal/database/repositories"
	"github.com/kubeatlas/kubeatlas/internal/k8s"
	"github.com/kubeatlas/kubeatlas/internal/models"
	"go.uber.org/zap"
)

var (
	ErrClusterNotFound     = errors.New("cluster not found")
	ErrClusterNameExists   = errors.New("cluster name already exists")
	ErrClusterSyncFailed   = errors.New("cluster sync failed")
)

type ClusterService struct {
	clusterRepo   *repositories.ClusterRepository
	namespaceRepo *repositories.NamespaceRepository
	k8sManager    *k8s.Manager
	auditSvc      *AuditService
	logger        *zap.SugaredLogger
}

func NewClusterService(
	clusterRepo *repositories.ClusterRepository,
	namespaceRepo *repositories.NamespaceRepository,
	k8sManager *k8s.Manager,
	auditSvc *AuditService,
	logger *zap.SugaredLogger,
) *ClusterService {
	return &ClusterService{
		clusterRepo:   clusterRepo,
		namespaceRepo: namespaceRepo,
		k8sManager:    k8sManager,
		auditSvc:      auditSvc,
		logger:        logger,
	}
}

// CreateClusterRequest represents cluster creation data
type CreateClusterRequest struct {
	Name              string     `json:"name" binding:"required"`
	DisplayName       string     `json:"display_name"`
	Description       string     `json:"description"`
	APIServerURL      string     `json:"api_server_url" binding:"required,url"`
	ClusterType       string     `json:"cluster_type" binding:"required"`
	Environment       string     `json:"environment" binding:"required"`
	Platform          string     `json:"platform"`
	Region            string     `json:"region"`
	AuthMethod        string     `json:"auth_method"`
	Kubeconfig        string     `json:"kubeconfig"`
	ServiceAccountToken string   `json:"service_account_token"`
	SkipTLSVerify     bool       `json:"skip_tls_verify"`
	OwnerTeamID       *uuid.UUID `json:"owner_team_id"`
	ResponsibleUserID *uuid.UUID `json:"responsible_user_id"`
	Tags              []string   `json:"tags"`
}

// Create creates a new cluster
func (s *ClusterService) Create(ctx context.Context, ac AuditContext, req CreateClusterRequest) (*models.Cluster, error) {
	// Check if name already exists
	existing, err := s.clusterRepo.GetByName(ctx, ac.OrgID, req.Name)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, ErrClusterNameExists
	}

	cluster := &models.Cluster{
		OrganizationID:    ac.OrgID,
		Name:              req.Name,
		APIServerURL:      req.APIServerURL,
		ClusterType:       req.ClusterType,
		Environment:       req.Environment,
		AuthMethod:        req.AuthMethod,
		SkipTLSVerify:     req.SkipTLSVerify,
		OwnerTeamID:       req.OwnerTeamID,
		ResponsibleUserID: req.ResponsibleUserID,
		Status:            "active",
		Tags:              req.Tags,
		Labels:            make(models.JSONMap),
		Annotations:       make(models.JSONMap),
		Metadata:          make(models.JSONMap),
	}

	if req.DisplayName != "" {
		cluster.DisplayName = sql.NullString{String: req.DisplayName, Valid: true}
	}
	if req.Description != "" {
		cluster.Description = sql.NullString{String: req.Description, Valid: true}
	}
	if req.Platform != "" {
		cluster.Platform = sql.NullString{String: req.Platform, Valid: true}
	}
	if req.Region != "" {
		cluster.Region = sql.NullString{String: req.Region, Valid: true}
	}

	// TODO: Encrypt and store kubeconfig/token
	// cluster.KubeconfigEncrypted = encrypt(req.Kubeconfig)
	// cluster.ServiceAccountTokenEncrypted = encrypt(req.ServiceAccountToken)

	if err := s.clusterRepo.Create(ctx, cluster); err != nil {
		return nil, err
	}

	s.auditSvc.LogCreate(ctx, ac, "cluster", cluster.ID, cluster.Name, StructToMap(cluster))
	s.logger.Infow("Cluster created", "cluster_id", cluster.ID, "name", cluster.Name)

	return cluster, nil
}

// GetByID retrieves a cluster by ID
func (s *ClusterService) GetByID(ctx context.Context, id uuid.UUID) (*models.Cluster, error) {
	cluster, err := s.clusterRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if cluster == nil {
		return nil, ErrClusterNotFound
	}
	return cluster, nil
}

// List retrieves clusters with pagination
func (s *ClusterService) List(ctx context.Context, orgID uuid.UUID, p repositories.Pagination, filters map[string]interface{}) (*repositories.PaginatedResult[models.Cluster], error) {
	return s.clusterRepo.List(ctx, orgID, p, filters)
}

// UpdateClusterRequest represents cluster update data
type UpdateClusterRequest struct {
	DisplayName       string     `json:"display_name"`
	Description       string     `json:"description"`
	APIServerURL      string     `json:"api_server_url"`
	ClusterType       string     `json:"cluster_type"`
	Environment       string     `json:"environment"`
	Platform          string     `json:"platform"`
	Region            string     `json:"region"`
	SkipTLSVerify     *bool      `json:"skip_tls_verify"`
	OwnerTeamID       *uuid.UUID `json:"owner_team_id"`
	ResponsibleUserID *uuid.UUID `json:"responsible_user_id"`
	Status            string     `json:"status"`
	Tags              []string   `json:"tags"`
}

// Update updates a cluster
func (s *ClusterService) Update(ctx context.Context, ac AuditContext, id uuid.UUID, req UpdateClusterRequest) (*models.Cluster, error) {
	cluster, err := s.clusterRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if cluster == nil {
		return nil, ErrClusterNotFound
	}

	oldValues := StructToMap(cluster)

	// Apply updates
	if req.DisplayName != "" {
		cluster.DisplayName = sql.NullString{String: req.DisplayName, Valid: true}
	}
	if req.Description != "" {
		cluster.Description = sql.NullString{String: req.Description, Valid: true}
	}
	if req.APIServerURL != "" {
		cluster.APIServerURL = req.APIServerURL
	}
	if req.ClusterType != "" {
		cluster.ClusterType = req.ClusterType
	}
	if req.Environment != "" {
		cluster.Environment = req.Environment
	}
	if req.Platform != "" {
		cluster.Platform = sql.NullString{String: req.Platform, Valid: true}
	}
	if req.Region != "" {
		cluster.Region = sql.NullString{String: req.Region, Valid: true}
	}
	if req.SkipTLSVerify != nil {
		cluster.SkipTLSVerify = *req.SkipTLSVerify
	}
	if req.OwnerTeamID != nil {
		cluster.OwnerTeamID = req.OwnerTeamID
	}
	if req.ResponsibleUserID != nil {
		cluster.ResponsibleUserID = req.ResponsibleUserID
	}
	if req.Status != "" {
		cluster.Status = req.Status
	}
	if req.Tags != nil {
		cluster.Tags = req.Tags
	}

	if err := s.clusterRepo.Update(ctx, cluster); err != nil {
		return nil, err
	}

	s.auditSvc.LogUpdate(ctx, ac, "cluster", cluster.ID, cluster.Name, oldValues, StructToMap(cluster))
	s.logger.Infow("Cluster updated", "cluster_id", cluster.ID)

	return cluster, nil
}

// Delete deletes a cluster
func (s *ClusterService) Delete(ctx context.Context, ac AuditContext, id uuid.UUID) error {
	cluster, err := s.clusterRepo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if cluster == nil {
		return ErrClusterNotFound
	}

	if err := s.clusterRepo.Delete(ctx, id); err != nil {
		return err
	}

	s.auditSvc.LogDelete(ctx, ac, "cluster", id, cluster.Name)
	s.logger.Infow("Cluster deleted", "cluster_id", id)

	return nil
}

// Sync syncs cluster resources from Kubernetes
func (s *ClusterService) Sync(ctx context.Context, ac AuditContext, id uuid.UUID) error {
	cluster, err := s.clusterRepo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if cluster == nil {
		return ErrClusterNotFound
	}

	// Update status to syncing
	s.clusterRepo.UpdateSyncStatus(ctx, id, "syncing", "", cluster.NodeCount, cluster.NamespaceCount)

	// Get Kubernetes client
	client, err := s.k8sManager.GetClient(cluster)
	if err != nil {
		s.clusterRepo.UpdateSyncStatus(ctx, id, "error", err.Error(), cluster.NodeCount, cluster.NamespaceCount)
		return ErrClusterSyncFailed
	}

	// Discover namespaces
	namespaces, err := client.DiscoverNamespaces(ctx)
	if err != nil {
		s.clusterRepo.UpdateSyncStatus(ctx, id, "error", err.Error(), cluster.NodeCount, cluster.NamespaceCount)
		return ErrClusterSyncFailed
	}

	// Get node count
	nodeCount, err := client.GetNodeCount(ctx)
	if err != nil {
		nodeCount = 0
	}

	// Sync namespaces to database
	for _, ns := range namespaces {
		existing, err := s.namespaceRepo.GetByClusterAndName(ctx, cluster.ID, ns.Name)
		if err != nil {
			continue
		}

		if existing == nil {
			// Create new namespace
			newNs := &models.Namespace{
				OrganizationID: cluster.OrganizationID,
				ClusterID:      cluster.ID,
				Name:           ns.Name,
				Status:         "active",
				Environment:    "unknown",
				Criticality:    "tier-3",
				K8sLabels:      ns.Labels,
				K8sAnnotations: ns.Annotations,
				Tags:           []string{},
				CustomFields:   make(models.JSONMap),
				Metadata:       make(models.JSONMap),
			}
			if ns.UID != "" {
				newNs.K8sUID = sql.NullString{String: ns.UID, Valid: true}
			}
			s.namespaceRepo.Create(ctx, newNs)
		} else {
			// Update existing namespace K8s metadata
			s.namespaceRepo.UpdateFromK8s(ctx, existing.ID, ns.UID, ns.Labels, ns.Annotations, ns.CreatedAt)
		}
	}

	// Update sync status
	s.clusterRepo.UpdateSyncStatus(ctx, id, "active", "", nodeCount, len(namespaces))

	s.auditSvc.LogAction(ctx, ac, "sync", "cluster", id, cluster.Name, "Cluster synced successfully")
	s.logger.Infow("Cluster synced", "cluster_id", id, "namespaces", len(namespaces), "nodes", nodeCount)

	return nil
}

// GetStats returns cluster statistics
func (s *ClusterService) GetStats(ctx context.Context, orgID uuid.UUID) (map[string]interface{}, error) {
	return s.clusterRepo.GetStats(ctx, orgID)
}

// GetNamespaces returns namespaces for a cluster
func (s *ClusterService) GetNamespaces(ctx context.Context, clusterID uuid.UUID, p repositories.Pagination) (*repositories.PaginatedResult[models.Namespace], error) {
	filters := map[string]interface{}{"cluster_id": clusterID}
	
	cluster, err := s.clusterRepo.GetByID(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	if cluster == nil {
		return nil, ErrClusterNotFound
	}

	return s.namespaceRepo.List(ctx, cluster.OrganizationID, p, filters)
}
