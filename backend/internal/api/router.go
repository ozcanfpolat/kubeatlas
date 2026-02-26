package api

import (
	"github.com/gin-gonic/gin"
	"github.com/kubeatlas/kubeatlas/internal/api/handlers"
	"github.com/kubeatlas/kubeatlas/internal/api/middleware"
	"github.com/kubeatlas/kubeatlas/internal/services"
	"go.uber.org/zap"
)

// SetupRouter configures all routes
func SetupRouter(svc *services.Services, logger *zap.SugaredLogger, jwtSecret string, corsOrigins []string) *gin.Engine {
	// Set Gin mode
	gin.SetMode(gin.ReleaseMode)

	r := gin.New()

	// Global middleware
	r.Use(middleware.Recovery(logger))
	r.Use(middleware.RequestID())
	r.Use(middleware.Logger(logger))
	r.Use(middleware.CORS(corsOrigins))

	// Health endpoints (no auth)
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})
	r.GET("/ready", func(c *gin.Context) {
		// TODO: Check database connection
		c.JSON(200, gin.H{"status": "ready"})
	})

	// API v1
	v1 := r.Group("/api/v1")

	// Public routes (no auth required)
	auth := v1.Group("/auth")
	{
		auth.POST("/login", handlers.Login(svc))
		auth.POST("/refresh", handlers.RefreshToken(svc))
	}

	// Protected routes
	protected := v1.Group("")
	protected.Use(middleware.Auth(jwtSecret))
	{
		// Auth
		protected.POST("/auth/logout", handlers.Logout(svc))

		// Users
		users := protected.Group("/users")
		{
			users.GET("/me", handlers.GetCurrentUser(svc))
			users.GET("", handlers.ListUsers(svc))
			users.GET("/:id", handlers.GetUser(svc))
			users.POST("", middleware.RoleRequired("admin"), handlers.CreateUser(svc))
			users.PUT("/:id", middleware.RoleRequired("admin", "editor"), handlers.UpdateUser(svc))
			users.DELETE("/:id", middleware.RoleRequired("admin"), handlers.DeleteUser(svc))
		}

		// Dashboard
		dashboard := protected.Group("/dashboard")
		{
			dashboard.GET("/stats", handlers.GetDashboardStats(svc))
			dashboard.GET("/recent-activities", handlers.GetRecentActivities(svc))
			dashboard.GET("/missing-info", handlers.GetMissingInfo(svc))
		}

		// Clusters
		clusters := protected.Group("/clusters")
		{
			clusters.GET("", handlers.ListClusters(svc))
			clusters.GET("/stats", handlers.GetClusterStats(svc))
			clusters.GET("/:id", handlers.GetCluster(svc))
			clusters.GET("/:id/namespaces", handlers.ListClusterNamespaces(svc))
			clusters.POST("", middleware.RoleRequired("admin", "editor"), handlers.CreateCluster(svc))
			clusters.PUT("/:id", middleware.RoleRequired("admin", "editor"), handlers.UpdateCluster(svc))
			clusters.POST("/:id/sync", middleware.RoleRequired("admin", "editor"), handlers.SyncCluster(svc))
			clusters.DELETE("/:id", middleware.RoleRequired("admin"), handlers.DeleteCluster(svc))
		}

		// Namespaces
		namespaces := protected.Group("/namespaces")
		{
			namespaces.GET("", handlers.ListNamespaces(svc))
			namespaces.GET("/:id", handlers.GetNamespace(svc))
			namespaces.PUT("/:id", middleware.RoleRequired("admin", "editor"), handlers.UpdateNamespace(svc))
			namespaces.GET("/:id/dependencies", handlers.ListNamespaceDependencies(svc))
			namespaces.GET("/:id/documents", handlers.ListNamespaceDocuments(svc))
			namespaces.GET("/:id/history", handlers.ListNamespaceHistory(svc))
		}

		// Teams
		teams := protected.Group("/teams")
		{
			teams.GET("", handlers.ListTeams(svc))
			teams.GET("/:id", handlers.GetTeam(svc))
			teams.GET("/:id/members", handlers.ListTeamMembers(svc))
			teams.POST("", middleware.RoleRequired("admin", "editor"), handlers.CreateTeam(svc))
			teams.PUT("/:id", middleware.RoleRequired("admin", "editor"), handlers.UpdateTeam(svc))
			teams.DELETE("/:id", middleware.RoleRequired("admin"), handlers.DeleteTeam(svc))
			teams.POST("/:id/members", middleware.RoleRequired("admin", "editor"), handlers.AddTeamMember(svc))
			teams.DELETE("/:id/members/:userId", middleware.RoleRequired("admin", "editor"), handlers.RemoveTeamMember(svc))
		}

		// Business Units
		businessUnits := protected.Group("/business-units")
		{
			businessUnits.GET("", handlers.ListBusinessUnits(svc))
			businessUnits.GET("/:id", handlers.GetBusinessUnit(svc))
			businessUnits.POST("", middleware.RoleRequired("admin"), handlers.CreateBusinessUnit(svc))
			businessUnits.PUT("/:id", middleware.RoleRequired("admin"), handlers.UpdateBusinessUnit(svc))
			businessUnits.DELETE("/:id", middleware.RoleRequired("admin"), handlers.DeleteBusinessUnit(svc))
		}

		// Internal Dependencies
		internalDeps := protected.Group("/dependencies/internal")
		{
			internalDeps.GET("", handlers.ListInternalDependencies(svc))
			internalDeps.POST("", middleware.RoleRequired("admin", "editor"), handlers.CreateInternalDependency(svc))
			internalDeps.PUT("/:id", middleware.RoleRequired("admin", "editor"), handlers.UpdateInternalDependency(svc))
			internalDeps.DELETE("/:id", middleware.RoleRequired("admin", "editor"), handlers.DeleteInternalDependency(svc))
		}

		// External Dependencies
		externalDeps := protected.Group("/dependencies/external")
		{
			externalDeps.GET("", handlers.ListExternalDependencies(svc))
			externalDeps.POST("", middleware.RoleRequired("admin", "editor"), handlers.CreateExternalDependency(svc))
			externalDeps.PUT("/:id", middleware.RoleRequired("admin", "editor"), handlers.UpdateExternalDependency(svc))
			externalDeps.DELETE("/:id", middleware.RoleRequired("admin", "editor"), handlers.DeleteExternalDependency(svc))
		}

		// Dependency Graph
		protected.GET("/dependencies/graph/:namespaceId", handlers.GetDependencyGraph(svc))

		// Documents
		documents := protected.Group("/documents")
		{
			documents.GET("", handlers.ListDocuments(svc))
			documents.GET("/categories", handlers.ListDocumentCategories(svc))
			documents.GET("/:id", handlers.GetDocument(svc))
			documents.GET("/:id/download", handlers.DownloadDocument(svc))
			documents.POST("", middleware.RoleRequired("admin", "editor"), handlers.UploadDocument(svc))
			documents.PUT("/:id", middleware.RoleRequired("admin", "editor"), handlers.UpdateDocument(svc))
			documents.DELETE("/:id", middleware.RoleRequired("admin", "editor"), handlers.DeleteDocument(svc))
		}

		// Reports
		reports := protected.Group("/reports")
		{
			reports.GET("/ownership-coverage", handlers.OwnershipCoverageReport(svc))
			reports.GET("/orphaned-resources", handlers.OrphanedResourcesReport(svc))
			reports.GET("/dependency-matrix", handlers.DependencyMatrixReport(svc))
			reports.GET("/export", handlers.ExportReport(svc))
		}

		// Audit
		audit := protected.Group("/audit")
		{
			audit.GET("", handlers.ListAuditLogs(svc))
			audit.GET("/:resourceType/:resourceId", handlers.GetResourceAuditLogs(svc))
		}

		// Settings
		settings := protected.Group("/settings")
		{
			settings.GET("", handlers.GetSettings(svc))
			settings.PUT("", middleware.RoleRequired("admin"), handlers.UpdateSettings(svc))
		}
	}

	return r
}
