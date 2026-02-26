package services

import (
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kubeatlas/kubeatlas/internal/database/repositories"
	"github.com/kubeatlas/kubeatlas/internal/k8s"
	"go.uber.org/zap"
)

// Services contains all application services
type Services struct {
	Auth         *AuthService
	Cluster      *ClusterService
	Namespace    *NamespaceService
	Dependency   *DependencyService
	Document     *DocumentService
	Team         *TeamService
	User         *UserService
	BusinessUnit *BusinessUnitService
	Dashboard    *DashboardService
	Audit        *AuditService

	Repos *Repositories
}

// Repositories contains all repository instances
type Repositories struct {
	Cluster            *repositories.ClusterRepository
	Namespace          *repositories.NamespaceRepository
	Team               *repositories.TeamRepository
	User               *repositories.UserRepository
	BusinessUnit       *repositories.BusinessUnitRepository
	InternalDependency *repositories.InternalDependencyRepository
	ExternalDependency *repositories.ExternalDependencyRepository
	Document           *repositories.DocumentRepository
	Audit              *repositories.AuditRepository
}

// New creates a new Services instance
func New(pool *pgxpool.Pool, k8sManager *k8s.Manager, logger *zap.SugaredLogger) *Services {
	repos := &Repositories{
		Cluster:            repositories.NewClusterRepository(pool),
		Namespace:          repositories.NewNamespaceRepository(pool),
		Team:               repositories.NewTeamRepository(pool),
		User:               repositories.NewUserRepository(pool),
		BusinessUnit:       repositories.NewBusinessUnitRepository(pool),
		InternalDependency: repositories.NewInternalDependencyRepository(pool),
		ExternalDependency: repositories.NewExternalDependencyRepository(pool),
		Document:           repositories.NewDocumentRepository(pool),
		Audit:              repositories.NewAuditRepository(pool),
	}

	auditSvc := NewAuditService(repos.Audit, logger)

	return &Services{
		Repos:        repos,
		Audit:        auditSvc,
		Auth:         NewAuthService(repos.User, logger),
		Team:         NewTeamService(repos.Team, auditSvc, logger),
		User:         NewUserService(repos.User, auditSvc, logger),
		BusinessUnit: NewBusinessUnitService(repos.BusinessUnit, auditSvc, logger),
		Cluster:      NewClusterService(repos.Cluster, repos.Namespace, k8sManager, auditSvc, logger),
		Namespace:    NewNamespaceService(repos.Namespace, repos.Cluster, auditSvc, logger),
		Dependency:   NewDependencyService(repos.InternalDependency, repos.ExternalDependency, auditSvc, logger),
		Document:     NewDocumentService(repos.Document, auditSvc, logger),
		Dashboard:    NewDashboardService(repos, logger),
	}
}
