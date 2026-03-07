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
					"status":    "not_ready",
					"error":     "database connection failed",
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
			users.GET("/me", handlers.GetCurrentUser(cfg.Services))
			users.GET("/me/preferences", handlers.GetUserPreferences(cfg.Services))
			users.PUT("/me/preferences", handlers.UpdateUserPreferences(cfg.Services))
			users.GET("", handlers.ListUsers(cfg.Services))
			users.GET("/:id", handlers.GetUser(cfg.Services))
			users.POST("", middleware.RequireRole("admin"), handlers.CreateUser(cfg.Services))
			users.PUT("/:id", middleware.RequireRole("admin", "editor"), handlers.UpdateUser(cfg.Services))
			users.DELETE("/:id", middleware.RequireRole("admin"), handlers.DeleteUser(cfg.Services))
		}

		// Dashboard
		dashboard := protected.Group("/dashboard")
		{
			dashboard.GET("/stats", handlers.GetDashboardStats(cfg.Services))
			dashboard.GET("/recent-activities", handlers.GetRecentActivities(cfg.Services))
			dashboard.GET("/missing-info", handlers.GetMissingInfo(cfg.Services))
		}

		// Clusters
		clusters := protected.Group("/clusters")
		{
			clusters.GET("", handlers.ListClusters(cfg.Services))
			clusters.GET("/stats", handlers.GetClusterStats(cfg.Services))
			clusters.GET("/:id", handlers.GetCluster(cfg.Services))
			clusters.GET("/:id/namespaces", handlers.ListClusterNamespaces(cfg.Services))
			clusters.POST("", middleware.RequireRole("admin", "editor"), handlers.CreateCluster(cfg.Services))
			clusters.PUT("/:id", middleware.RequireRole("admin", "editor"), handlers.UpdateCluster(cfg.Services))
			clusters.POST("/:id/sync", middleware.RequireRole("admin", "editor"), handlers.SyncCluster(cfg.Services))
			clusters.DELETE("/:id", middleware.RequireRole("admin"), handlers.DeleteCluster(cfg.Services))
		}

		// Namespaces
		namespaces := protected.Group("/namespaces")
		{
			namespaces.GET("", handlers.ListNamespaces(cfg.Services))
			namespaces.GET("/:id", handlers.GetNamespace(cfg.Services))
			namespaces.PUT("/:id", middleware.RequireRole("admin", "editor"), handlers.UpdateNamespace(cfg.Services))
			namespaces.GET("/:id/dependencies", handlers.ListNamespaceDependencies(cfg.Services))
			namespaces.GET("/:id/documents", handlers.ListNamespaceDocuments(cfg.Services))
			namespaces.GET("/:id/history", handlers.ListNamespaceHistory(cfg.Services))
		}

		// Teams
		teams := protected.Group("/teams")
		{
			teams.GET("", handlers.ListTeams(cfg.Services))
			teams.GET("/:id", handlers.GetTeam(cfg.Services))
			teams.GET("/:id/members", handlers.ListTeamMembers(cfg.Services))
			teams.POST("", middleware.RequireRole("admin", "editor"), handlers.CreateTeam(cfg.Services))
			teams.PUT("/:id", middleware.RequireRole("admin", "editor"), handlers.UpdateTeam(cfg.Services))
			teams.DELETE("/:id", middleware.RequireRole("admin"), handlers.DeleteTeam(cfg.Services))
			teams.POST("/:id/members", middleware.RequireRole("admin", "editor"), handlers.AddTeamMember(cfg.Services))
			teams.DELETE("/:id/members/:userId", middleware.RequireRole("admin", "editor"), handlers.RemoveTeamMember(cfg.Services))
		}

		// Business Units
		businessUnits := protected.Group("/business-units")
		{
			businessUnits.GET("", handlers.ListBusinessUnits(cfg.Services))
			businessUnits.GET("/:id", handlers.GetBusinessUnit(cfg.Services))
			businessUnits.POST("", middleware.RequireRole("admin"), handlers.CreateBusinessUnit(cfg.Services))
			businessUnits.PUT("/:id", middleware.RequireRole("admin"), handlers.UpdateBusinessUnit(cfg.Services))
			businessUnits.DELETE("/:id", middleware.RequireRole("admin"), handlers.DeleteBusinessUnit(cfg.Services))
		}

		// Internal Dependencies
		internalDeps := protected.Group("/dependencies/internal")
		{
			internalDeps.GET("", handlers.ListInternalDependencies(cfg.Services))
			internalDeps.POST("", middleware.RequireRole("admin", "editor"), handlers.CreateInternalDependency(cfg.Services))
			internalDeps.PUT("/:id", middleware.RequireRole("admin", "editor"), handlers.UpdateInternalDependency(cfg.Services))
			internalDeps.DELETE("/:id", middleware.RequireRole("admin", "editor"), handlers.DeleteInternalDependency(cfg.Services))
		}

		// External Dependencies
		externalDeps := protected.Group("/dependencies/external")
		{
			externalDeps.GET("", handlers.ListExternalDependencies(cfg.Services))
			externalDeps.POST("", middleware.RequireRole("admin", "editor"), handlers.CreateExternalDependency(cfg.Services))
			externalDeps.PUT("/:id", middleware.RequireRole("admin", "editor"), handlers.UpdateExternalDependency(cfg.Services))
			externalDeps.DELETE("/:id", middleware.RequireRole("admin", "editor"), handlers.DeleteExternalDependency(cfg.Services))
		}

		// Dependency Graph
		protected.GET("/dependencies/graph/:namespaceId", handlers.GetDependencyGraph(cfg.Services))

		// Documents
		documents := protected.Group("/documents")
		{
			documents.GET("", handlers.ListDocuments(cfg.Services))
			documents.GET("/categories", handlers.ListDocumentCategories(cfg.Services))
			documents.GET("/:id", handlers.GetDocument(cfg.Services))
			documents.GET("/:id/download", handlers.DownloadDocument(cfg.Services))
			documents.POST("", middleware.RequireRole("admin", "editor"), handlers.UploadDocument(cfg.Services))
			documents.PUT("/:id", middleware.RequireRole("admin", "editor"), handlers.UpdateDocument(cfg.Services))
			documents.DELETE("/:id", middleware.RequireRole("admin", "editor"), handlers.DeleteDocument(cfg.Services))
		}

		// Reports
		reports := protected.Group("/reports")
		{
			reports.GET("/ownership-coverage", handlers.OwnershipCoverageReport(cfg.Services))
			reports.GET("/orphaned-resources", handlers.OrphanedResourcesReport(cfg.Services))
			reports.GET("/dependency-matrix", handlers.DependencyMatrixReport(cfg.Services))
			reports.GET("/export", handlers.ExportReport(cfg.Services))
		}

		// Audit
		audit := protected.Group("/audit")
		{
			audit.GET("", handlers.ListAuditLogs(cfg.Services))
			audit.GET("/:resourceType/:resourceId", handlers.GetResourceAuditLogs(cfg.Services))
		}

		// Settings
		settings := protected.Group("/settings")
		{
			settings.GET("", handlers.GetSettings(cfg.Services))
			settings.PUT("", middleware.RequireRole("admin"), handlers.UpdateSettings(cfg.Services))
		}
	}

	return r
}
