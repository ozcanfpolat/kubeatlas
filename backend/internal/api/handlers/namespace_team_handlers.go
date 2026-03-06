package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/kubeatlas/kubeatlas/internal/api/middleware"
	"github.com/kubeatlas/kubeatlas/internal/services"
)

// ============================================
// Namespace Handlers
// ============================================

// ListNamespaces returns all namespaces
func ListNamespaces(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID, ok := middleware.GetOrganizationID(c)
		if !ok {
			respondErrorStr(c, http.StatusUnauthorized, "Organization ID not found in context")
			return
		}
		p := getPagination(c)

		filters := make(map[string]interface{})
		if clusterID := c.Query("cluster_id"); clusterID != "" {
			if id, err := uuid.Parse(clusterID); err == nil {
				filters["cluster_id"] = id
			}
		}
		if environment := c.Query("environment"); environment != "" {
			filters["environment"] = environment
		}
		if criticality := c.Query("criticality"); criticality != "" {
			filters["criticality"] = criticality
		}
		if status := c.Query("status"); status != "" {
			filters["status"] = status
		}
		if businessUnitID := c.Query("business_unit_id"); businessUnitID != "" {
			if id, err := uuid.Parse(businessUnitID); err == nil {
				filters["business_unit_id"] = id
			}
		}
		if teamID := c.Query("team_id"); teamID != "" {
			if id, err := uuid.Parse(teamID); err == nil {
				filters["team_id"] = id
			}
		}
		if search := c.Query("search"); search != "" {
			filters["search"] = search
		}
		if orphaned := c.Query("orphaned"); orphaned == "true" {
			filters["orphaned"] = true
		}
		if undocumented := c.Query("undocumented"); undocumented == "true" {
			filters["undocumented"] = true
		}

		result, err := svc.Namespace.List(c.Request.Context(), orgID, p, filters)
		if err != nil {
			respondError(c, http.StatusInternalServerError, err)
			return
		}

		if result == nil {
			respondPaginated(c, []interface{}{}, 0, p.Page, p.PageSize, 0)
			return
		}

		respondPaginated(c, result.Items, result.Total, result.Page, result.PageSize, result.TotalPages)
	}
}

// GetNamespace returns a single namespace
func GetNamespace(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parseUUID(c, "id")
		if !ok {
			return
		}

		ns, err := svc.Namespace.GetByID(c.Request.Context(), id)
		if err != nil {
			if errors.Is(err, services.ErrNamespaceNotFound) {
				respondErrorStr(c, http.StatusNotFound, "Namespace not found")
				return
			}
			respondErrorStr(c, http.StatusInternalServerError, "Failed to get namespace")
			return
		}

		respondSuccess(c, ns)
	}
}

// UpdateNamespace updates a namespace
func UpdateNamespace(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parseUUID(c, "id")
		if !ok {
			return
		}

		var req services.UpdateNamespaceRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			respondErrorStr(c, http.StatusBadRequest, "Invalid request body")
			return
		}

		actx := getAuditContext(c)

		ns, err := svc.Namespace.Update(c.Request.Context(), actx, id, req)
		if err != nil {
			if errors.Is(err, services.ErrNamespaceNotFound) {
				respondErrorStr(c, http.StatusNotFound, "Namespace not found")
				return
			}
			respondErrorStr(c, http.StatusInternalServerError, "Failed to update namespace")
			return
		}

		respondSuccess(c, ns)
	}
}

// ListNamespaceDependencies returns dependencies for a namespace
func ListNamespaceDependencies(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parseUUID(c, "id")
		if !ok {
			return
		}

		internal, err := svc.Dependency.ListInternalByNamespace(c.Request.Context(), id)
		if err != nil {
			respondErrorStr(c, http.StatusInternalServerError, "Failed to get internal dependencies")
			return
		}

		external, err := svc.Dependency.ListExternalByNamespace(c.Request.Context(), id)
		if err != nil {
			respondErrorStr(c, http.StatusInternalServerError, "Failed to get external dependencies")
			return
		}

		respondSuccess(c, gin.H{
			"internal": internal,
			"external": external,
		})
	}
}

// ListNamespaceDocuments returns documents for a namespace
func ListNamespaceDocuments(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parseUUID(c, "id")
		if !ok {
			return
		}

		docs, err := svc.Document.ListByNamespace(c.Request.Context(), id)
		if err != nil {
			respondErrorStr(c, http.StatusInternalServerError, "Failed to get documents")
			return
		}

		respondSuccess(c, docs)
	}
}

// ListNamespaceHistory returns audit history for a namespace
func ListNamespaceHistory(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parseUUID(c, "id")
		if !ok {
			return
		}

		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))

		history, err := svc.Audit.ListByResource(c.Request.Context(), "namespace", id, limit)
		if err != nil {
			respondErrorStr(c, http.StatusInternalServerError, "Failed to get namespace history")
			return
		}

		respondSuccess(c, history)
	}
}

// ============================================
// Team Handlers (Additional)
// ============================================

// AddTeamMember adds a member to a team
func AddTeamMember(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		teamID, ok := parseUUID(c, "id")
		if !ok {
			return
		}

		var req struct {
			UserID uuid.UUID `json:"user_id" binding:"required"`
			Role   string    `json:"role"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			respondErrorStr(c, http.StatusBadRequest, "Invalid request body")
			return
		}

		actx := getAuditContext(c)

		if err := svc.Team.AddMember(c.Request.Context(), actx, teamID, req.UserID, req.Role); err != nil {
			respondErrorStr(c, http.StatusInternalServerError, "Failed to add team member")
			return
		}

		c.JSON(http.StatusCreated, gin.H{"message": "Member added successfully"})
	}
}

// RemoveTeamMember removes a member from a team
func RemoveTeamMember(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		teamID, ok := parseUUID(c, "id")
		if !ok {
			return
		}

		userID, ok := parseUUID(c, "userId")
		if !ok {
			return
		}

		actx := getAuditContext(c)

		if err := svc.Team.RemoveMember(c.Request.Context(), actx, teamID, userID); err != nil {
			respondErrorStr(c, http.StatusInternalServerError, "Failed to remove team member")
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Member removed successfully"})
	}
}
