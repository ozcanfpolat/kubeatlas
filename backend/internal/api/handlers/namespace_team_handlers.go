package handlers

import (
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
		orgID := middleware.GetOrganizationID(c)
		page, pageSize := getPageParams(c)

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

		result, err := svc.Namespace.List(c.Request.Context(), orgID, page, pageSize, filters)
		if err != nil {
			respondError(c, http.StatusInternalServerError, "Failed to list namespaces")
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
			if err == services.ErrNamespaceNotFound {
				respondError(c, http.StatusNotFound, "Namespace not found")
				return
			}
			respondError(c, http.StatusInternalServerError, "Failed to get namespace")
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
			respondError(c, http.StatusBadRequest, "Invalid request body")
			return
		}

		actx := middleware.GetAuditContext(c)

		ns, err := svc.Namespace.Update(c.Request.Context(), id, req, actx)
		if err != nil {
			if err == services.ErrNamespaceNotFound {
				respondError(c, http.StatusNotFound, "Namespace not found")
				return
			}
			respondError(c, http.StatusInternalServerError, "Failed to update namespace")
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
			respondError(c, http.StatusInternalServerError, "Failed to get internal dependencies")
			return
		}

		external, err := svc.Dependency.ListExternalByNamespace(c.Request.Context(), id)
		if err != nil {
			respondError(c, http.StatusInternalServerError, "Failed to get external dependencies")
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
			respondError(c, http.StatusInternalServerError, "Failed to get documents")
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

		history, err := svc.Audit.GetByResource(c.Request.Context(), "namespace", id, limit)
		if err != nil {
			respondError(c, http.StatusInternalServerError, "Failed to get namespace history")
			return
		}

		respondSuccess(c, history)
	}
}

// ============================================
// Team Handlers
// ============================================

// ListTeams returns all teams
func ListTeams(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID := middleware.GetOrganizationID(c)

		teams, err := svc.Team.List(c.Request.Context(), orgID)
		if err != nil {
			respondError(c, http.StatusInternalServerError, "Failed to list teams")
			return
		}

		respondSuccess(c, teams)
	}
}

// GetTeam returns a single team
func GetTeam(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parseUUID(c, "id")
		if !ok {
			return
		}

		team, err := svc.Team.GetByID(c.Request.Context(), id)
		if err != nil {
			if err == services.ErrTeamNotFound {
				respondError(c, http.StatusNotFound, "Team not found")
				return
			}
			respondError(c, http.StatusInternalServerError, "Failed to get team")
			return
		}

		respondSuccess(c, team)
	}
}

// CreateTeam creates a new team
func CreateTeam(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req services.CreateTeamRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			respondError(c, http.StatusBadRequest, "Invalid request body")
			return
		}

		orgID := middleware.GetOrganizationID(c)
		actx := middleware.GetAuditContext(c)

		team, err := svc.Team.Create(c.Request.Context(), orgID, req, actx)
		if err != nil {
			respondError(c, http.StatusInternalServerError, "Failed to create team")
			return
		}

		c.JSON(http.StatusCreated, SuccessResponse{Data: team})
	}
}

// UpdateTeam updates a team
func UpdateTeam(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parseUUID(c, "id")
		if !ok {
			return
		}

		var req services.UpdateTeamRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			respondError(c, http.StatusBadRequest, "Invalid request body")
			return
		}

		actx := middleware.GetAuditContext(c)

		team, err := svc.Team.Update(c.Request.Context(), id, req, actx)
		if err != nil {
			if err == services.ErrTeamNotFound {
				respondError(c, http.StatusNotFound, "Team not found")
				return
			}
			respondError(c, http.StatusInternalServerError, "Failed to update team")
			return
		}

		respondSuccess(c, team)
	}
}

// DeleteTeam deletes a team
func DeleteTeam(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parseUUID(c, "id")
		if !ok {
			return
		}

		actx := middleware.GetAuditContext(c)

		if err := svc.Team.Delete(c.Request.Context(), id, actx); err != nil {
			if err == services.ErrTeamNotFound {
				respondError(c, http.StatusNotFound, "Team not found")
				return
			}
			respondError(c, http.StatusInternalServerError, "Failed to delete team")
			return
		}

		c.JSON(http.StatusNoContent, nil)
	}
}

// ListTeamMembers returns members of a team
func ListTeamMembers(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parseUUID(c, "id")
		if !ok {
			return
		}

		members, err := svc.Team.GetMembers(c.Request.Context(), id)
		if err != nil {
			respondError(c, http.StatusInternalServerError, "Failed to get team members")
			return
		}

		respondSuccess(c, members)
	}
}

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
			respondError(c, http.StatusBadRequest, "Invalid request body")
			return
		}

		actx := middleware.GetAuditContext(c)

		if err := svc.Team.AddMember(c.Request.Context(), teamID, req.UserID, req.Role, actx); err != nil {
			respondError(c, http.StatusInternalServerError, "Failed to add team member")
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

		actx := middleware.GetAuditContext(c)

		if err := svc.Team.RemoveMember(c.Request.Context(), teamID, userID, actx); err != nil {
			respondError(c, http.StatusInternalServerError, "Failed to remove team member")
			return
		}

		c.JSON(http.StatusNoContent, nil)
	}
}

// ============================================
// User Handlers
// ============================================

// ListUsers returns all users
func ListUsers(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID := middleware.GetOrganizationID(c)
		page, pageSize := getPageParams(c)

		result, err := svc.User.List(c.Request.Context(), orgID, page, pageSize)
		if err != nil {
			respondError(c, http.StatusInternalServerError, "Failed to list users")
			return
		}

		respondPaginated(c, result.Items, result.Total, result.Page, result.PageSize, result.TotalPages)
	}
}

// GetUser returns a single user
func GetUser(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parseUUID(c, "id")
		if !ok {
			return
		}

		user, err := svc.User.GetByID(c.Request.Context(), id)
		if err != nil {
			if err == services.ErrUserNotFound {
				respondError(c, http.StatusNotFound, "User not found")
				return
			}
			respondError(c, http.StatusInternalServerError, "Failed to get user")
			return
		}

		respondSuccess(c, user)
	}
}

// GetCurrentUser returns the current authenticated user
func GetCurrentUser(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := middleware.GetUserID(c)

		user, err := svc.User.GetByID(c.Request.Context(), userID)
		if err != nil {
			respondError(c, http.StatusInternalServerError, "Failed to get current user")
			return
		}

		respondSuccess(c, user)
	}
}

// CreateUser creates a new user
func CreateUser(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req services.CreateUserRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			respondError(c, http.StatusBadRequest, "Invalid request body")
			return
		}

		orgID := middleware.GetOrganizationID(c)
		actx := middleware.GetAuditContext(c)

		user, err := svc.User.Create(c.Request.Context(), orgID, req, actx)
		if err != nil {
			if err == services.ErrUserEmailExists {
				respondError(c, http.StatusConflict, "Email already exists")
				return
			}
			respondError(c, http.StatusInternalServerError, "Failed to create user")
			return
		}

		c.JSON(http.StatusCreated, SuccessResponse{Data: user})
	}
}

// UpdateUser updates a user
func UpdateUser(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parseUUID(c, "id")
		if !ok {
			return
		}

		var req services.UpdateUserRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			respondError(c, http.StatusBadRequest, "Invalid request body")
			return
		}

		actx := middleware.GetAuditContext(c)

		user, err := svc.User.Update(c.Request.Context(), id, req, actx)
		if err != nil {
			if err == services.ErrUserNotFound {
				respondError(c, http.StatusNotFound, "User not found")
				return
			}
			respondError(c, http.StatusInternalServerError, "Failed to update user")
			return
		}

		respondSuccess(c, user)
	}
}

// DeleteUser deletes a user
func DeleteUser(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parseUUID(c, "id")
		if !ok {
			return
		}

		actx := middleware.GetAuditContext(c)

		if err := svc.User.Delete(c.Request.Context(), id, actx); err != nil {
			if err == services.ErrUserNotFound {
				respondError(c, http.StatusNotFound, "User not found")
				return
			}
			respondError(c, http.StatusInternalServerError, "Failed to delete user")
			return
		}

		c.JSON(http.StatusNoContent, nil)
	}
}
