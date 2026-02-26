package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/kubeatlas/kubeatlas/internal/services"
)

// GetAuditContext creates an audit context from request context values.
func GetAuditContext(c *gin.Context) services.AuditContext {
	var userID *uuid.UUID
	if id, ok := GetUserID(c); ok && id != uuid.Nil {
		userID = &id
	}

	orgID, _ := GetOrganizationID(c)
	userEmail, _ := GetUserEmail(c)

	return services.AuditContext{
		OrgID:     orgID,
		UserID:    userID,
		UserEmail: userEmail,
		UserIP:    c.ClientIP(),
		UserAgent: c.Request.UserAgent(),
	}
}
