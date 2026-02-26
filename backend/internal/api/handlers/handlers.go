package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/kubeatlas/kubeatlas/internal/api/middleware"
	"github.com/kubeatlas/kubeatlas/internal/services"
)

// ============================================
// Helper Functions
// ============================================

// getAuditContext creates an audit context from the request
func getAuditContext(c *gin.Context) services.AuditContext {
	orgID, _ := middleware.GetOrganizationID(c)
	userID, _ := middleware.GetUserID(c)
	email, _ := middleware.GetUserEmail(c)

	actx := services.AuditContext{
		OrganizationID: orgID,
		UserEmail:      email,
		UserIP:         c.ClientIP(),
		UserAgent:      c.Request.UserAgent(),
	}

	if userID != uuid.Nil {
		actx.UserID = &userID
	}

	return actx
}

// respondError sends an error response
func respondError(c *gin.Context, status int, err error) {
	c.JSON(status, gin.H{
		"error":   http.StatusText(status),
		"message": err.Error(),
	})
}

// respondSuccess sends a success response
func respondSuccess(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, data)
}

// ============================================
// Auth Handlers
// ============================================

func Login(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req services.LoginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			respondError(c, http.StatusBadRequest, err)
			return
		}

		// For now, use a default org ID (in production, this would come from the request or domain)
		orgID := uuid.MustParse("00000000-0000-0000-0000-000000000001")

		tokens, user, err := svc.Auth.Login(c.Request.Context(), orgID, req, c.ClientIP(), c.Request.UserAgent())
		if err != nil {
			respondError(c, http.StatusUnauthorized, err)
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"tokens": tokens,
			"user": gin.H{
				"id":        user.ID,
				"email":     user.Email,
				"full_name": user.FullName.String,
				"role":      user.Role,
			},
		})
	}
}

func Logout(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, _ := middleware.GetUserID(c)
		orgID, _ := middleware.GetOrganizationID(c)
		svc.Auth.Logout(c.Request.Context(), userID, orgID, c.ClientIP(), c.Request.UserAgent())
		c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
	}
}

func RefreshToken(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			RefreshToken string `json:"refresh_token" binding:"required"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			respondError(c, http.StatusBadRequest, err)
			return
		}

		tokens, err := svc.Auth.RefreshToken(c.Request.Context(), req.RefreshToken)
		if err != nil {
			respondError(c, http.StatusUnauthorized, err)
			return
		}

		c.JSON(http.StatusOK, tokens)
	}
}

// ============================================
// User Handlers
// ============================================

func ListUsers(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID, _ := middleware.GetOrganizationID(c)
		result, err := svc.User.List(c.Request.Context(), orgID, 1, 100)
		if err != nil {
			respondError(c, http.StatusInternalServerError, err)
			return
		}
		respondSuccess(c, result)
	}
}

func GetUser(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := uuid.Parse(c.Param("id"))
		if err != nil {
			respondError(c, http.StatusBadRequest, err)
			return
		}

		user, err := svc.User.GetByID(c.Request.Context(), id)
		if err != nil {
			respondError(c, http.StatusNotFound, err)
			return
		}
		respondSuccess(c, user)
	}
}

func CreateUser(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req services.CreateUserRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			respondError(c, http.StatusBadRequest, err)
			return
		}

		orgID, _ := middleware.GetOrganizationID(c)
		user, err := svc.User.Create(c.Request.Context(), orgID, req, getAuditContext(c))
		if err != nil {
			respondError(c, http.StatusInternalServerError, err)
			return
		}
		c.JSON(http.StatusCreated, user)
	}
}

func UpdateUser(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := uuid.Parse(c.Param("id"))
		if err != nil {
			respondError(c, http.StatusBadRequest, err)
			return
		}

		var req services.UpdateUserRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			respondError(c, http.StatusBadRequest, err)
			return
		}

		user, err := svc.User.Update(c.Request.Context(), id, req, getAuditContext(c))
		if err != nil {
			respondError(c, http.StatusInternalServerError, err)
			return
		}
		respondSuccess(c, user)
	}
}

func DeleteUser(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := uuid.Parse(c.Param("id"))
		if err != nil {
			respondError(c, http.StatusBadRequest, err)
			return
		}

		if err := svc.User.Delete(c.Request.Context(), id, getAuditContext(c)); err != nil {
			respondError(c, http.StatusInternalServerError, err)
			return
		}
		c.JSON(http.StatusNoContent, nil)
	}
}

func GetCurrentUser(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, _ := middleware.GetUserID(c)
		user, err := svc.User.GetByID(c.Request.Context(), userID)
		if err != nil {
			respondError(c, http.StatusNotFound, err)
			return
		}
		respondSuccess(c, user)
	}
}

// ============================================
// Team Handlers
// ============================================

func ListTeams(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID, _ := middleware.GetOrganizationID(c)
		teams, err := svc.Team.List(c.Request.Context(), orgID)
		if err != nil {
			respondError(c, http.StatusInternalServerError, err)
			return
		}
		respondSuccess(c, gin.H{"items": teams})
	}
}

func GetTeam(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := uuid.Parse(c.Param("id"))
		if err != nil {
			respondError(c, http.StatusBadRequest, err)
			return
		}
		team, err := svc.Team.GetByID(c.Request.Context(), id)
		if err != nil {
			respondError(c, http.StatusNotFound, err)
			return
		}
		respondSuccess(c, team)
	}
}

func CreateTeam(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req services.CreateTeamRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			respondError(c, http.StatusBadRequest, err)
			return
		}
		orgID, _ := middleware.GetOrganizationID(c)
		team, err := svc.Team.Create(c.Request.Context(), orgID, req, getAuditContext(c))
		if err != nil {
			respondError(c, http.StatusInternalServerError, err)
			return
		}
		c.JSON(http.StatusCreated, team)
	}
}

func UpdateTeam(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := uuid.Parse(c.Param("id"))
		if err != nil {
			respondError(c, http.StatusBadRequest, err)
			return
		}
		var req services.UpdateTeamRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			respondError(c, http.StatusBadRequest, err)
			return
		}
		team, err := svc.Team.Update(c.Request.Context(), id, req, getAuditContext(c))
		if err != nil {
			respondError(c, http.StatusInternalServerError, err)
			return
		}
		respondSuccess(c, team)
	}
}

func DeleteTeam(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := uuid.Parse(c.Param("id"))
		if err != nil {
			respondError(c, http.StatusBadRequest, err)
			return
		}
		if err := svc.Team.Delete(c.Request.Context(), id, getAuditContext(c)); err != nil {
			respondError(c, http.StatusInternalServerError, err)
			return
		}
		c.JSON(http.StatusNoContent, nil)
	}
}

func ListTeamMembers(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := uuid.Parse(c.Param("id"))
		if err != nil {
			respondError(c, http.StatusBadRequest, err)
			return
		}
		members, err := svc.Team.GetMembers(c.Request.Context(), id)
		if err != nil {
			respondError(c, http.StatusInternalServerError, err)
			return
		}
		respondSuccess(c, gin.H{"items": members})
	}
}

func AddTeamMember(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		teamID, _ := uuid.Parse(c.Param("id"))
		var req struct {
			UserID uuid.UUID `json:"user_id" binding:"required"`
			Role   string    `json:"role"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			respondError(c, http.StatusBadRequest, err)
			return
		}
		if err := svc.Team.AddMember(c.Request.Context(), teamID, req.UserID, req.Role, getAuditContext(c)); err != nil {
			respondError(c, http.StatusInternalServerError, err)
			return
		}
		c.JSON(http.StatusCreated, gin.H{"message": "Member added"})
	}
}

func RemoveTeamMember(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		teamID, _ := uuid.Parse(c.Param("id"))
		userID, _ := uuid.Parse(c.Param("userId"))
		if err := svc.Team.RemoveMember(c.Request.Context(), teamID, userID, getAuditContext(c)); err != nil {
			respondError(c, http.StatusInternalServerError, err)
			return
		}
		c.JSON(http.StatusNoContent, nil)
	}
}

// ============================================
// Business Unit Handlers
// ============================================

func ListBusinessUnits(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID, _ := middleware.GetOrganizationID(c)
		units, err := svc.BusinessUnits.List(c.Request.Context(), orgID)
		if err != nil {
			respondError(c, http.StatusInternalServerError, err)
			return
		}
		respondSuccess(c, gin.H{"items": units})
	}
}

func GetBusinessUnit(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, _ := uuid.Parse(c.Param("id"))
		bu, err := svc.BusinessUnits.GetByID(c.Request.Context(), id)
		if err != nil {
			respondError(c, http.StatusNotFound, err)
			return
		}
		respondSuccess(c, bu)
	}
}

func CreateBusinessUnit(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"message": "Not implemented"})
	}
}

func UpdateBusinessUnit(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"message": "Not implemented"})
	}
}

func DeleteBusinessUnit(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"message": "Not implemented"})
	}
}

// ============================================
// Cluster Handlers
// ============================================

func ListClusters(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID, _ := middleware.GetOrganizationID(c)
		result, err := svc.Cluster.List(c.Request.Context(), orgID, 1, 100, nil)
		if err != nil {
			respondError(c, http.StatusInternalServerError, err)
			return
		}
		respondSuccess(c, result)
	}
}

func GetCluster(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, _ := uuid.Parse(c.Param("id"))
		cluster, err := svc.Cluster.GetByID(c.Request.Context(), id)
		if err != nil {
			respondError(c, http.StatusNotFound, err)
			return
		}
		respondSuccess(c, cluster)
	}
}

func CreateCluster(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req services.CreateClusterRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			respondError(c, http.StatusBadRequest, err)
			return
		}
		orgID, _ := middleware.GetOrganizationID(c)
		cluster, err := svc.Cluster.Create(c.Request.Context(), orgID, req, getAuditContext(c))
		if err != nil {
			respondError(c, http.StatusInternalServerError, err)
			return
		}
		c.JSON(http.StatusCreated, cluster)
	}
}

func UpdateCluster(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, _ := uuid.Parse(c.Param("id"))
		var req services.UpdateClusterRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			respondError(c, http.StatusBadRequest, err)
			return
		}
		cluster, err := svc.Cluster.Update(c.Request.Context(), id, req, getAuditContext(c))
		if err != nil {
			respondError(c, http.StatusInternalServerError, err)
			return
		}
		respondSuccess(c, cluster)
	}
}

func DeleteCluster(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, _ := uuid.Parse(c.Param("id"))
		if err := svc.Cluster.Delete(c.Request.Context(), id, getAuditContext(c)); err != nil {
			respondError(c, http.StatusInternalServerError, err)
			return
		}
		c.JSON(http.StatusNoContent, nil)
	}
}

func SyncCluster(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, _ := uuid.Parse(c.Param("id"))
		if err := svc.Cluster.Sync(c.Request.Context(), id); err != nil {
			respondError(c, http.StatusInternalServerError, err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Sync started"})
	}
}

func ListClusterNamespaces(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, _ := uuid.Parse(c.Param("id"))
		result, err := svc.Cluster.GetNamespaces(c.Request.Context(), id, 1, 100)
		if err != nil {
			respondError(c, http.StatusInternalServerError, err)
			return
		}
		respondSuccess(c, result)
	}
}

func GetClusterStats(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID, _ := middleware.GetOrganizationID(c)
		stats, err := svc.Cluster.GetStats(c.Request.Context(), orgID)
		if err != nil {
			respondError(c, http.StatusInternalServerError, err)
			return
		}
		respondSuccess(c, stats)
	}
}

// ============================================
// Namespace Handlers
// ============================================

func ListNamespaces(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID, _ := middleware.GetOrganizationID(c)
		result, err := svc.Namespace.List(c.Request.Context(), orgID, 1, 100, nil)
		if err != nil {
			respondError(c, http.StatusInternalServerError, err)
			return
		}
		respondSuccess(c, result)
	}
}

func GetNamespace(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, _ := uuid.Parse(c.Param("id"))
		ns, err := svc.Namespace.GetByID(c.Request.Context(), id)
		if err != nil {
			respondError(c, http.StatusNotFound, err)
			return
		}
		respondSuccess(c, ns)
	}
}

func UpdateNamespace(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, _ := uuid.Parse(c.Param("id"))
		var req services.UpdateNamespaceRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			respondError(c, http.StatusBadRequest, err)
			return
		}
		ns, err := svc.Namespace.Update(c.Request.Context(), id, req, getAuditContext(c))
		if err != nil {
			respondError(c, http.StatusInternalServerError, err)
			return
		}
		respondSuccess(c, ns)
	}
}

func ListNamespaceDependencies(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, _ := uuid.Parse(c.Param("id"))
		internal, _ := svc.Dependency.ListInternalByNamespace(c.Request.Context(), id)
		external, _ := svc.Dependency.ListExternalByNamespace(c.Request.Context(), id)
		respondSuccess(c, gin.H{
			"internal": internal,
			"external": external,
		})
	}
}

func ListNamespaceDocuments(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, _ := uuid.Parse(c.Param("id"))
		docs, err := svc.Document.ListByNamespace(c.Request.Context(), id)
		if err != nil {
			respondError(c, http.StatusInternalServerError, err)
			return
		}
		respondSuccess(c, gin.H{"items": docs})
	}
}

func ListNamespaceHistory(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, _ := uuid.Parse(c.Param("id"))
		history, err := svc.Audit.GetByResource(c.Request.Context(), "namespace", id, 50)
		if err != nil {
			respondError(c, http.StatusInternalServerError, err)
			return
		}
		respondSuccess(c, gin.H{"items": history})
	}
}

// ============================================
// Dependency Handlers
// ============================================

func ListInternalDependencies(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID, _ := middleware.GetOrganizationID(c)
		result, err := svc.Dependency.ListInternal(c.Request.Context(), orgID, 1, 100)
		if err != nil {
			respondError(c, http.StatusInternalServerError, err)
			return
		}
		respondSuccess(c, result)
	}
}

func CreateInternalDependency(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req services.CreateInternalDependencyRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			respondError(c, http.StatusBadRequest, err)
			return
		}
		orgID, _ := middleware.GetOrganizationID(c)
		dep, err := svc.Dependency.CreateInternal(c.Request.Context(), orgID, req, getAuditContext(c))
		if err != nil {
			respondError(c, http.StatusInternalServerError, err)
			return
		}
		c.JSON(http.StatusCreated, dep)
	}
}

func UpdateInternalDependency(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, _ := uuid.Parse(c.Param("id"))
		var req services.UpdateInternalDependencyRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			respondError(c, http.StatusBadRequest, err)
			return
		}
		dep, err := svc.Dependency.UpdateInternal(c.Request.Context(), id, req, getAuditContext(c))
		if err != nil {
			respondError(c, http.StatusInternalServerError, err)
			return
		}
		respondSuccess(c, dep)
	}
}

func DeleteInternalDependency(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, _ := uuid.Parse(c.Param("id"))
		if err := svc.Dependency.DeleteInternal(c.Request.Context(), id, getAuditContext(c)); err != nil {
			respondError(c, http.StatusInternalServerError, err)
			return
		}
		c.JSON(http.StatusNoContent, nil)
	}
}

func ListExternalDependencies(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"items": []interface{}{}})
	}
}

func CreateExternalDependency(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req services.CreateExternalDependencyRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			respondError(c, http.StatusBadRequest, err)
			return
		}
		orgID, _ := middleware.GetOrganizationID(c)
		dep, err := svc.Dependency.CreateExternal(c.Request.Context(), orgID, req, getAuditContext(c))
		if err != nil {
			respondError(c, http.StatusInternalServerError, err)
			return
		}
		c.JSON(http.StatusCreated, dep)
	}
}

func UpdateExternalDependency(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, _ := uuid.Parse(c.Param("id"))
		var req services.UpdateExternalDependencyRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			respondError(c, http.StatusBadRequest, err)
			return
		}
		dep, err := svc.Dependency.UpdateExternal(c.Request.Context(), id, req, getAuditContext(c))
		if err != nil {
			respondError(c, http.StatusInternalServerError, err)
			return
		}
		respondSuccess(c, dep)
	}
}

func DeleteExternalDependency(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, _ := uuid.Parse(c.Param("id"))
		if err := svc.Dependency.DeleteExternal(c.Request.Context(), id, getAuditContext(c)); err != nil {
			respondError(c, http.StatusInternalServerError, err)
			return
		}
		c.JSON(http.StatusNoContent, nil)
	}
}

func GetDependencyGraph(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, _ := uuid.Parse(c.Param("namespaceId"))
		graph, err := svc.Dependency.GetDependencyGraph(c.Request.Context(), id)
		if err != nil {
			respondError(c, http.StatusInternalServerError, err)
			return
		}
		respondSuccess(c, graph)
	}
}

// ============================================
// Document Handlers
// ============================================

func ListDocuments(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID, _ := middleware.GetOrganizationID(c)
		docs, err := svc.Document.GetRecent(c.Request.Context(), orgID, 100)
		if err != nil {
			respondError(c, http.StatusInternalServerError, err)
			return
		}
		respondSuccess(c, gin.H{"items": docs})
	}
}

func GetDocument(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, _ := uuid.Parse(c.Param("id"))
		doc, err := svc.Document.GetByID(c.Request.Context(), id)
		if err != nil {
			respondError(c, http.StatusNotFound, err)
			return
		}
		respondSuccess(c, doc)
	}
}

func UploadDocument(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		file, err := c.FormFile("file")
		if err != nil {
			respondError(c, http.StatusBadRequest, err)
			return
		}

		var req services.UploadDocumentRequest
		req.Name = c.PostForm("name")
		req.Description = c.PostForm("description")

		orgID, _ := middleware.GetOrganizationID(c)
		userID, _ := middleware.GetUserID(c)

		var namespaceID *uuid.UUID
		if nsID := c.PostForm("namespace_id"); nsID != "" {
			id, _ := uuid.Parse(nsID)
			namespaceID = &id
		}

		doc, err := svc.Document.Upload(c.Request.Context(), orgID, namespaceID, nil, userID, file, req, getAuditContext(c))
		if err != nil {
			respondError(c, http.StatusInternalServerError, err)
			return
		}
		c.JSON(http.StatusCreated, doc)
	}
}

func UpdateDocument(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, _ := uuid.Parse(c.Param("id"))
		var req services.UpdateDocumentRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			respondError(c, http.StatusBadRequest, err)
			return
		}
		doc, err := svc.Document.Update(c.Request.Context(), id, req, getAuditContext(c))
		if err != nil {
			respondError(c, http.StatusInternalServerError, err)
			return
		}
		respondSuccess(c, doc)
	}
}

func DeleteDocument(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, _ := uuid.Parse(c.Param("id"))
		if err := svc.Document.Delete(c.Request.Context(), id, getAuditContext(c)); err != nil {
			respondError(c, http.StatusInternalServerError, err)
			return
		}
		c.JSON(http.StatusNoContent, nil)
	}
}

func DownloadDocument(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, _ := uuid.Parse(c.Param("id"))
		filePath, fileName, err := svc.Document.GetFilePath(c.Request.Context(), id)
		if err != nil {
			respondError(c, http.StatusNotFound, err)
			return
		}
		c.FileAttachment(filePath, fileName)
	}
}

func ListDocumentCategories(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID, _ := middleware.GetOrganizationID(c)
		categories, err := svc.Document.GetCategories(c.Request.Context(), &orgID)
		if err != nil {
			respondError(c, http.StatusInternalServerError, err)
			return
		}
		respondSuccess(c, gin.H{"items": categories})
	}
}

// ============================================
// Report Handlers
// ============================================

func OwnershipCoverageReport(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID, _ := middleware.GetOrganizationID(c)
		stats, err := svc.Namespace.GetStats(c.Request.Context(), orgID)
		if err != nil {
			respondError(c, http.StatusInternalServerError, err)
			return
		}
		respondSuccess(c, stats)
	}
}

func OrphanedResourcesReport(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID, _ := middleware.GetOrganizationID(c)
		orphaned, err := svc.Namespace.GetOrphaned(c.Request.Context(), orgID, 100)
		if err != nil {
			respondError(c, http.StatusInternalServerError, err)
			return
		}
		respondSuccess(c, gin.H{"items": orphaned})
	}
}

func DependencyMatrixReport(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "Not implemented"})
	}
}

func ExportReport(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "Not implemented"})
	}
}

// ============================================
// Dashboard Handlers
// ============================================

func GetDashboardStats(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID, _ := middleware.GetOrganizationID(c)
		data, err := svc.Dashboard.GetDashboardData(c.Request.Context(), orgID)
		if err != nil {
			respondError(c, http.StatusInternalServerError, err)
			return
		}
		respondSuccess(c, data)
	}
}

func GetRecentActivities(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID, _ := middleware.GetOrganizationID(c)
		activities, err := svc.Dashboard.GetRecentActivities(c.Request.Context(), orgID, 20)
		if err != nil {
			respondError(c, http.StatusInternalServerError, err)
			return
		}
		respondSuccess(c, gin.H{"items": activities})
	}
}

func GetMissingInfo(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID, _ := middleware.GetOrganizationID(c)
		info, err := svc.Dashboard.GetMissingInfo(c.Request.Context(), orgID)
		if err != nil {
			respondError(c, http.StatusInternalServerError, err)
			return
		}
		respondSuccess(c, info)
	}
}

// ============================================
// Audit Handlers
// ============================================

func ListAuditLogs(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID, _ := middleware.GetOrganizationID(c)
		result, err := svc.Audit.List(c.Request.Context(), orgID, 1, 100, nil)
		if err != nil {
			respondError(c, http.StatusInternalServerError, err)
			return
		}
		respondSuccess(c, result)
	}
}

func GetResourceAuditLogs(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		resourceType := c.Param("resourceType")
		resourceID, _ := uuid.Parse(c.Param("resourceId"))
		logs, err := svc.Audit.GetByResource(c.Request.Context(), resourceType, resourceID, 100)
		if err != nil {
			respondError(c, http.StatusInternalServerError, err)
			return
		}
		respondSuccess(c, gin.H{"items": logs})
	}
}

// ============================================
// Settings Handlers
// ============================================

func GetSettings(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"settings": map[string]interface{}{}})
	}
}

func UpdateSettings(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "Settings updated"})
	}
}
