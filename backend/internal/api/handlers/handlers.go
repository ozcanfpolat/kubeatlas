package handlers

import (
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/kubeatlas/kubeatlas/internal/api/middleware"
	"github.com/kubeatlas/kubeatlas/internal/database/repositories"
	"github.com/kubeatlas/kubeatlas/internal/models"
	"github.com/kubeatlas/kubeatlas/internal/services"
)

// ============================================
// Response Types
// ============================================

type SuccessResponse struct {
	Data interface{} `json:"data"`
}

type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
}

type PaginatedResponse struct {
	Items      interface{} `json:"items"`
	Total      int64       `json:"total"`
	Page       int         `json:"page"`
	PageSize   int         `json:"page_size"`
	TotalPages int         `json:"total_pages"`
}

// TeamResponse is a DTO for Team with plain strings instead of NullString
type TeamResponse struct {
	ID             uuid.UUID  `json:"id"`
	OrganizationID uuid.UUID  `json:"organization_id"`
	Name           string     `json:"name"`
	Slug           string     `json:"slug"`
	Description    string     `json:"description,omitempty"`
	ParentID       *uuid.UUID `json:"parent_id,omitempty"`
	TeamType       string     `json:"team_type"`
	ContactEmail   string     `json:"contact_email,omitempty"`
	ContactSlack   string     `json:"contact_slack,omitempty"`
	MemberCount    int        `json:"member_count"`
}

// toTeamResponse converts a models.Team to TeamResponse
func toTeamResponse(t models.Team) TeamResponse {
	return TeamResponse{
		ID:             t.ID,
		OrganizationID: t.OrganizationID,
		Name:           t.Name,
		Slug:           t.Slug,
		Description:    t.Description.ValueOrEmpty(),
		ParentID:       t.ParentID,
		TeamType:       t.TeamType,
		ContactEmail:   t.ContactEmail.ValueOrEmpty(),
		ContactSlack:   t.ContactSlack.ValueOrEmpty(),
		MemberCount:    t.MemberCount,
	}
}

// ============================================
// Helper Functions
// ============================================

// getAuditContext creates an audit context from the request
func getAuditContext(c *gin.Context) services.AuditContext {
	orgID, _ := middleware.GetOrganizationID(c)
	userID, _ := middleware.GetUserID(c)
	email, _ := middleware.GetUserEmail(c)

	actx := services.AuditContext{
		OrgID:     orgID,
		UserEmail: email,
		UserIP:    c.ClientIP(),
		UserAgent: c.Request.UserAgent(),
	}

	if userID != uuid.Nil {
		actx.UserID = &userID
	}

	return actx
}

// respondError sends an error response with error type
func respondError(c *gin.Context, status int, err error) {
	c.JSON(status, ErrorResponse{
		Error:   http.StatusText(status),
		Message: err.Error(),
	})
}

// respondErrorStr sends an error response with string message
func respondErrorStr(c *gin.Context, status int, message string) {
	c.JSON(status, ErrorResponse{
		Error:   http.StatusText(status),
		Message: message,
	})
}

// respondSuccess sends a success response
func respondSuccess(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, SuccessResponse{Data: data})
}

// respondPaginated sends a paginated response
func respondPaginated(c *gin.Context, items interface{}, total int64, page, pageSize, totalPages int) {
	c.JSON(http.StatusOK, PaginatedResponse{
		Items:      items,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	})
}

// parseUUID parses a UUID from URL parameter
func parseUUID(c *gin.Context, param string) (uuid.UUID, bool) {
	id, err := uuid.Parse(c.Param(param))
	if err != nil {
		respondError(c, http.StatusBadRequest, err)
		return uuid.Nil, false
	}
	return id, true
}

// getPagination extracts pagination parameters from query string
func getPagination(c *gin.Context) repositories.Pagination {
	page := 1
	pageSize := 20

	if p := c.Query("page"); p != "" {
		if val, err := strconv.Atoi(p); err == nil && val > 0 {
			page = val
		}
	}

	if ps := c.Query("page_size"); ps != "" {
		if val, err := strconv.Atoi(ps); err == nil && val > 0 && val <= 100 {
			pageSize = val
		}
	}

	return repositories.Pagination{
		Page:     page,
		PageSize: pageSize,
		Sort:     c.Query("sort"),
		Order:    c.DefaultQuery("order", "asc"),
	}
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

		tokens, user, err := svc.Auth.Login(c.Request.Context(), orgID, req)
		if err != nil {
			respondError(c, http.StatusUnauthorized, err)
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"tokens": tokens,
			"user": gin.H{
				"id":        user.ID,
				"email":     user.Email,
				"full_name": user.FullName.ValueOrEmpty(),
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
		p := getPagination(c)
		
		log.Printf("INFO ListUsers - orgID: %s, page: %d, pageSize: %d", orgID, p.Page, p.PageSize)
		
		result, err := svc.User.List(c.Request.Context(), orgID, p)
		if err != nil {
			log.Printf("ERROR ListUsers: %v", err)
			respondError(c, http.StatusInternalServerError, err)
			return
		}
		
		log.Printf("INFO ListUsers - found %d users, total: %d", len(result.Items), result.Total)
		
		respondPaginated(c, result.Items, result.Total, result.Page, result.PageSize, result.TotalPages)
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
			log.Printf("ERROR CreateUser - bind error: %v", err)
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "validation_error",
				"message": "Invalid request: " + err.Error(),
				"details": "Email must be valid, password is required",
			})
			return
		}

		log.Printf("INFO CreateUser - email: %s, role: %s, has_password: %v", req.Email, req.Role, req.Password != "")

		// Validate password for local users
		if req.Password == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "validation_error",
				"message": "Password is required for local users",
			})
			return
		}

		// Validate role
		validRoles := map[string]bool{"admin": true, "editor": true, "viewer": true, "": true}
		if !validRoles[req.Role] {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "validation_error",
				"message": "Invalid role. Must be 'admin', 'editor', or 'viewer'",
			})
			return
		}

		// Set default role
		if req.Role == "" {
			req.Role = "viewer"
		}

		user, err := svc.User.Create(c.Request.Context(), getAuditContext(c), req)
		if err != nil {
			log.Printf("ERROR CreateUser - create failed: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "create_failed",
				"message": err.Error(),
			})
			return
		}
		
		log.Printf("INFO CreateUser - success: %s", user.Email)
		c.JSON(http.StatusCreated, gin.H{"data": user})
	}
}

func UpdateUser(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := uuid.Parse(c.Param("id"))
		if err != nil {
			respondError(c, http.StatusBadRequest, err)
			return
		}

		var req services.CreateUserRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			respondError(c, http.StatusBadRequest, err)
			return
		}

		user, err := svc.User.Update(c.Request.Context(), getAuditContext(c), id, req)
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

		if err := svc.User.Delete(c.Request.Context(), getAuditContext(c), id); err != nil {
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
		orgID, ok := middleware.GetOrganizationID(c)
		if !ok {
			log.Printf("ERROR ListTeams: Organization ID not found in context")
			respondErrorStr(c, http.StatusUnauthorized, "Organization ID not found in context")
			return
		}
		teams, err := svc.Team.List(c.Request.Context(), orgID)
		if err != nil {
			log.Printf("ERROR ListTeams: orgID=%s, err=%v", orgID, err)
			respondError(c, http.StatusInternalServerError, err)
			return
		}
		if teams == nil {
			teams = []models.Team{}
		}
		// Convert to TeamResponse to avoid NullString serialization issues
		responses := make([]TeamResponse, len(teams))
		for i, t := range teams {
			responses[i] = toTeamResponse(t)
		}
		respondSuccess(c, responses)
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
		respondSuccess(c, toTeamResponse(*team))
	}
}

func CreateTeam(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req services.CreateTeamRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			respondError(c, http.StatusBadRequest, err)
			return
		}
		team, err := svc.Team.Create(c.Request.Context(), getAuditContext(c), req)
		if err != nil {
			respondError(c, http.StatusInternalServerError, err)
			return
		}
		c.JSON(http.StatusCreated, gin.H{"data": team})
	}
}

func UpdateTeam(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := uuid.Parse(c.Param("id"))
		if err != nil {
			log.Printf("ERROR UpdateTeam: invalid id=%s, err=%v", c.Param("id"), err)
			respondError(c, http.StatusBadRequest, err)
			return
		}
		var req services.CreateTeamRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			log.Printf("ERROR UpdateTeam: binding error for id=%s, err=%v", id, err)
			respondError(c, http.StatusBadRequest, err)
			return
		}
		team, err := svc.Team.Update(c.Request.Context(), getAuditContext(c), id, req)
		if err != nil {
			log.Printf("ERROR UpdateTeam: update failed for id=%s, err=%v", id, err)
			respondError(c, http.StatusInternalServerError, err)
			return
		}
		respondSuccess(c, toTeamResponse(*team))
	}
}

func DeleteTeam(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := uuid.Parse(c.Param("id"))
		if err != nil {
			respondError(c, http.StatusBadRequest, err)
			return
		}
		if err := svc.Team.Delete(c.Request.Context(), getAuditContext(c), id); err != nil {
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
		respondSuccess(c, members)
	}
}
