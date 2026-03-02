package api

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kubeatlas/kubeatlas/internal/api/handlers"
	"github.com/kubeatlas/kubeatlas/internal/api/middleware"
	"github.com/kubeatlas/kubeatlas/internal/services"
	"go.uber.org/zap"
)

// Config holds router configuration
type Config struct {
	Services    *services.Services
	Logger      *zap.SugaredLogger
	DB          *pgxpool.Pool
	JWTTSecret  string
	CORSOrigins []string
	RateLimit   int           // requests per window
	RateWindow  time.Duration // rate limit window
}

// SetupRouter configures all routes
func SetupRouter(cfg *Config) *gin.Engine {
	// Set Gin mode
	gin.SetMode(gin.ReleaseMode)

	r := gin.New()

	// Global middleware
	r.Use(middleware.Recovery(cfg.Logger))
	r.Use(middleware.RequestID())
	r.Use(middleware.Logger(cfg.Logger))
	r.Use(middleware.CORS(cfg.CORSOrigins))
	r.Use(middleware.Prometheus())

	// Apply rate limiting globally (100 requests per minute)
	if cfg.RateLimit == 0 {
		cfg.RateLimit = 100
	}
	if cfg.RateWindow == 0 {
		cfg.RateWindow = time.Minute
	}
	r.Use(middleware.RateLimiterMiddleware(cfg.RateLimit, cfg.RateWindow))

	// Health endpoints (no auth)
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "timestamp": time.Now().UTC()})
	})
	
	r.GET("/ready", func(c *gin.Context) {
		// Check database connection
		if cfg.DB != nil {
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			
			if err := cfg.DB.Ping(ctx); err != nil {
				c.JSON(http.StatusServiceUnavailable, gin.H{
					"status": "not_ready",
					"error":  "database connection failed",
					"timestamp": time.Now().UTC(),
				})
				return
			}
		}
		
		c.JSON(200, gin.H{
			"status":    "ready",
			"timestamp": time.Now().UTC(),
			"checks": gin.H{
				"database": "ok",
			},
		})
	})

	// Metrics endpoint (Prometheus)
	r.GET("/metrics", middleware.MetricsHandler())

	// API v1
	v1 := r.Group("/api/v1")

	// Public routes (no auth required)
	auth := v1.Group("/auth")
	{
		auth.POST("/login", handlers.Login(cfg.Services))
		auth.POST("/refresh", handlers.RefreshToken(cfg.Services))
	}

	// Protected routes
	protected := v1.Group("")
	protected.Use(middleware.Auth(cfg.JWTTSecret))
	{
		// Auth
		protected.POST("/auth/logout", handlers.Logout(cfg.Services))

		// Users
		users := protected.Group("/users")
		{
			users.GET("/me", handlers.GetCurrentUser(svc))
			users.GET("", handlers.ListUsers(svc))
			users.GET("/:id", handlers.GetUser(svc))
			users.POST("", middleware.RequireRole("admin"), handlers.CreateUser(svc))
			users.PUT("/:id", middleware.RequireRole("admin", "editor"), handlers.UpdateUser(svc))
			users.DELETE("/:id", middleware.RequireRole("admin"), handlers.DeleteUser(svc))
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
			clusters.POST("", middleware.RequireRole("admin", "editor"), handlers.CreateCluster(svc))
			clusters.PUT("/:id", middleware.RequireRole("admin", "editor"), handlers.UpdateCluster(svc))
			clusters.POST("/:id/sync", middleware.RequireRole("admin", "editor"), handlers.SyncCluster(svc))
			clusters.DELETE("/:id", middleware.RequireRole("admin"), handlers.DeleteCluster(svc))
		}

		// Namespaces
		namespaces := protected.Group("/namespaces")
		{
			namespaces.GET("", handlers.ListNamespaces(svc))
			namespaces.GET("/:id", handlers.GetNamespace(svc))
			namespaces.PUT("/:id", middleware.RequireRole("admin", "editor"), handlers.UpdateNamespace(svc))
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
			teams.POST("", middleware.RequireRole("admin", "editor"), handlers.CreateTeam(svc))
			teams.PUT("/:id", middleware.RequireRole("admin", "editor"), handlers.UpdateTeam(svc))
			teams.DELETE("/:id", middleware.RequireRole("admin"), handlers.DeleteTeam(svc))
			teams.POST("/:id/members", middleware.RequireRole("admin", "editor"), handlers.AddTeamMember(svc))
			teams.DELETE("/:id/members/:userId", middleware.RequireRole("admin", "editor"), handlers.RemoveTeamMember(svc))
		}

		// Business Units
		businessUnits := protected.Group("/business-units")
		{
			businessUnits.GET("", handlers.ListBusinessUnits(svc))
			businessUnits.GET("/:id", handlers.GetBusinessUnit(svc))
			businessUnits.POST("", middleware.RequireRole("admin"), handlers.CreateBusinessUnit(svc))
			businessUnits.PUT("/:id", middleware.RequireRole("admin"), handlers.UpdateBusinessUnit(svc))
			businessUnits.DELETE("/:id", middleware.RequireRole("admin"), handlers.DeleteBusinessUnit(svc))
		}

		// Internal Dependencies
		internalDeps := protected.Group("/dependencies/internal")
		{
			internalDeps.GET("", handlers.ListInternalDependencies(svc))
			internalDeps.POST("", middleware.RequireRole("admin", "editor"), handlers.CreateInternalDependency(svc))
			internalDeps.PUT("/:id", middleware.RequireRole("admin", "editor"), handlers.UpdateInternalDependency(svc))
			internalDeps.DELETE("/:id", middleware.RequireRole("admin", "editor"), handlers.DeleteInternalDependency(svc))
		}

		// External Dependencies
		externalDeps := protected.Group("/dependencies/external")
		{
			externalDeps.GET("", handlers.ListExternalDependencies(svc))
			externalDeps.POST("", middleware.RequireRole("admin", "editor"), handlers.CreateExternalDependency(svc))
			externalDeps.PUT("/:id", middleware.RequireRole("admin", "editor"), handlers.UpdateExternalDependency(svc))
			externalDeps.DELETE("/:id", middleware.RequireRole("admin", "editor"), handlers.DeleteExternalDependency(svc))
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
			documents.POST("", middleware.RequireRole("admin", "editor"), handlers.UploadDocument(svc))
			documents.PUT("/:id", middleware.RequireRole("admin", "editor"), handlers.UpdateDocument(svc))
			documents.DELETE("/:id", middleware.RequireRole("admin", "editor"), handlers.DeleteDocument(svc))
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
			settings.PUT("", middleware.RequireRole("admin"), handlers.UpdateSettings(svc))
		}
	}

	return r
}
