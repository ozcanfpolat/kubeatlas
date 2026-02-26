package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/kubeatlas/kubeatlas/internal/api/handlers"
	"github.com/kubeatlas/kubeatlas/internal/api/middleware"
	"github.com/kubeatlas/kubeatlas/internal/config"
	"github.com/kubeatlas/kubeatlas/internal/database"
	"github.com/kubeatlas/kubeatlas/internal/k8s"
	"github.com/kubeatlas/kubeatlas/internal/services"
	"go.uber.org/zap"
)

var (
	Version   = "dev"
	BuildTime = "unknown"
	GitCommit = "unknown"
)

func main() {
	// Initialize logger
	logger, _ := zap.NewProduction()
	defer logger.Sync()
	sugar := logger.Sugar()

	sugar.Infow("Starting KubeAtlas API",
		"version", Version,
		"build_time", BuildTime,
		"git_commit", GitCommit,
	)

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		sugar.Fatalw("Failed to load configuration", "error", err)
	}

	// Initialize database
	db, err := database.New(cfg.Database)
	if err != nil {
		sugar.Fatalw("Failed to connect to database", "error", err)
	}
	defer db.Close()

	// Run migrations
	if err := db.Migrate(); err != nil {
		sugar.Fatalw("Failed to run migrations", "error", err)
	}

	// Initialize Kubernetes client manager
	k8sManager := k8s.NewManager(sugar)

	// Initialize services
	svc := services.New(db, k8sManager, sugar)

	// Initialize Gin router
	if cfg.Server.Mode == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(middleware.Logger(sugar))
	router.Use(middleware.RequestID())

	// CORS configuration
	router.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.Server.CORSOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Request-ID"},
		ExposeHeaders:    []string{"Content-Length", "X-Request-ID"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Health check endpoints
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "healthy",
			"version": Version,
		})
	})

	router.GET("/ready", func(c *gin.Context) {
		if err := db.Ping(); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"status": "not ready",
				"error":  "database connection failed",
			})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ready"})
	})

	// API routes
	api := router.Group("/api/v1")
	{
		// Authentication
		auth := api.Group("/auth")
		{
			auth.POST("/login", handlers.Login(svc))
			auth.POST("/logout", handlers.Logout(svc))
			auth.POST("/refresh", handlers.RefreshToken(svc))
		}

		// Protected routes
		protected := api.Group("")
		protected.Use(middleware.Auth(cfg.JWT.Secret))
		{
			// Users
			users := protected.Group("/users")
			{
				users.GET("", handlers.ListUsers(svc))
				users.GET("/:id", handlers.GetUser(svc))
				users.POST("", handlers.CreateUser(svc))
				users.PUT("/:id", handlers.UpdateUser(svc))
				users.DELETE("/:id", handlers.DeleteUser(svc))
				users.GET("/me", handlers.GetCurrentUser(svc))
			}

			// Teams
			teams := protected.Group("/teams")
			{
				teams.GET("", handlers.ListTeams(svc))
				teams.GET("/:id", handlers.GetTeam(svc))
				teams.POST("", handlers.CreateTeam(svc))
				teams.PUT("/:id", handlers.UpdateTeam(svc))
				teams.DELETE("/:id", handlers.DeleteTeam(svc))
				teams.GET("/:id/members", handlers.ListTeamMembers(svc))
				teams.POST("/:id/members", handlers.AddTeamMember(svc))
				teams.DELETE("/:id/members/:userId", handlers.RemoveTeamMember(svc))
			}

			// Business Units
			businessUnits := protected.Group("/business-units")
			{
				businessUnits.GET("", handlers.ListBusinessUnits(svc))
				businessUnits.GET("/:id", handlers.GetBusinessUnit(svc))
				businessUnits.POST("", handlers.CreateBusinessUnit(svc))
				businessUnits.PUT("/:id", handlers.UpdateBusinessUnit(svc))
				businessUnits.DELETE("/:id", handlers.DeleteBusinessUnit(svc))
			}

			// Clusters
			clusters := protected.Group("/clusters")
			{
				clusters.GET("", handlers.ListClusters(svc))
				clusters.GET("/:id", handlers.GetCluster(svc))
				clusters.POST("", handlers.CreateCluster(svc))
				clusters.PUT("/:id", handlers.UpdateCluster(svc))
				clusters.DELETE("/:id", handlers.DeleteCluster(svc))
				clusters.POST("/:id/sync", handlers.SyncCluster(svc))
				clusters.GET("/:id/namespaces", handlers.ListClusterNamespaces(svc))
				clusters.GET("/:id/stats", handlers.GetClusterStats(svc))
			}

			// Namespaces
			namespaces := protected.Group("/namespaces")
			{
				namespaces.GET("", handlers.ListNamespaces(svc))
				namespaces.GET("/:id", handlers.GetNamespace(svc))
				namespaces.PUT("/:id", handlers.UpdateNamespace(svc))
				namespaces.GET("/:id/dependencies", handlers.ListNamespaceDependencies(svc))
				namespaces.GET("/:id/documents", handlers.ListNamespaceDocuments(svc))
				namespaces.GET("/:id/history", handlers.ListNamespaceHistory(svc))
			}

			// Dependencies
			dependencies := protected.Group("/dependencies")
			{
				// Internal dependencies
				dependencies.GET("/internal", handlers.ListInternalDependencies(svc))
				dependencies.POST("/internal", handlers.CreateInternalDependency(svc))
				dependencies.PUT("/internal/:id", handlers.UpdateInternalDependency(svc))
				dependencies.DELETE("/internal/:id", handlers.DeleteInternalDependency(svc))

				// External dependencies
				dependencies.GET("/external", handlers.ListExternalDependencies(svc))
				dependencies.POST("/external", handlers.CreateExternalDependency(svc))
				dependencies.PUT("/external/:id", handlers.UpdateExternalDependency(svc))
				dependencies.DELETE("/external/:id", handlers.DeleteExternalDependency(svc))

				// Dependency graph
				dependencies.GET("/graph/:namespaceId", handlers.GetDependencyGraph(svc))
			}

			// Documents
			documents := protected.Group("/documents")
			{
				documents.GET("", handlers.ListDocuments(svc))
				documents.GET("/:id", handlers.GetDocument(svc))
				documents.POST("", handlers.UploadDocument(svc))
				documents.PUT("/:id", handlers.UpdateDocument(svc))
				documents.DELETE("/:id", handlers.DeleteDocument(svc))
				documents.GET("/:id/download", handlers.DownloadDocument(svc))
				documents.GET("/categories", handlers.ListDocumentCategories(svc))
			}

			// Reports
			reports := protected.Group("/reports")
			{
				reports.GET("/ownership-coverage", handlers.OwnershipCoverageReport(svc))
				reports.GET("/orphaned-resources", handlers.OrphanedResourcesReport(svc))
				reports.GET("/dependency-matrix", handlers.DependencyMatrixReport(svc))
				reports.GET("/export", handlers.ExportReport(svc))
			}

			// Dashboard
			dashboard := protected.Group("/dashboard")
			{
				dashboard.GET("/stats", handlers.GetDashboardStats(svc))
				dashboard.GET("/recent-activities", handlers.GetRecentActivities(svc))
				dashboard.GET("/missing-info", handlers.GetMissingInfo(svc))
			}

			// Audit logs
			audit := protected.Group("/audit")
			{
				audit.GET("", handlers.ListAuditLogs(svc))
				audit.GET("/:resourceType/:resourceId", handlers.GetResourceAuditLogs(svc))
			}

			// Settings
			settings := protected.Group("/settings")
			{
				settings.GET("", handlers.GetSettings(svc))
				settings.PUT("", handlers.UpdateSettings(svc))
			}
		}
	}

	// Create HTTP server
	server := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Server.Port),
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in goroutine
	go func() {
		sugar.Infow("Starting HTTP server", "port", cfg.Server.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			sugar.Fatalw("Failed to start server", "error", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	sugar.Info("Shutting down server...")

	// Graceful shutdown with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		sugar.Fatalw("Server forced to shutdown", "error", err)
	}

	sugar.Info("Server exited gracefully")
}
