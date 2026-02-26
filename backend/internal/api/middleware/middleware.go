package middleware

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/kubeatlas/kubeatlas/internal/services"
	"go.uber.org/zap"
)

// RequestID adds a unique request ID to each request
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = uuid.New().String()
		}
		c.Set("request_id", requestID)
		c.Header("X-Request-ID", requestID)
		c.Next()
	}
}

// Logger logs HTTP requests
func Logger(logger *zap.SugaredLogger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		query := c.Request.URL.RawQuery

		c.Next()

		latency := time.Since(start)
		status := c.Writer.Status()

		// Skip health check logs
		if path == "/health" || path == "/ready" {
			return
		}

		fields := []interface{}{
			"status", status,
			"method", c.Request.Method,
			"path", path,
			"latency", latency.String(),
			"ip", c.ClientIP(),
			"user_agent", c.Request.UserAgent(),
		}

		if query != "" {
			fields = append(fields, "query", query)
		}

		if requestID, exists := c.Get("request_id"); exists {
			fields = append(fields, "request_id", requestID)
		}

		if userID, exists := c.Get("user_id"); exists {
			fields = append(fields, "user_id", userID)
		}

		if status >= 500 {
			logger.Errorw("HTTP Request", fields...)
		} else if status >= 400 {
			logger.Warnw("HTTP Request", fields...)
		} else {
			logger.Infow("HTTP Request", fields...)
		}
	}
}

// Auth middleware for JWT authentication
func Auth(jwtSecret string) gin.HandlerFunc {
	authService := &services.AuthService{}
	authService.SetJWTConfig(jwtSecret, 24, 168)

	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Authorization header required",
			})
			return
		}

		// Extract token from "Bearer <token>"
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid authorization header format",
			})
			return
		}

		token := parts[1]

		// Validate token
		claims, err := authService.ValidateToken(token)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid or expired token",
			})
			return
		}

		// Set user info in context
		c.Set("user_id", claims.UserID)
		c.Set("organization_id", claims.OrganizationID)
		c.Set("user_email", claims.Email)
		c.Set("user_role", claims.Role)
		c.Set("claims", claims)

		c.Next()
	}
}

// RoleRequired middleware to check user role
func RoleRequired(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, exists := c.Get("user_role")
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "User role not found",
			})
			return
		}

		role := userRole.(string)
		for _, r := range roles {
			if role == r {
				c.Next()
				return
			}
		}

		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
			"error": "Insufficient permissions",
		})
	}
}

// CORS middleware
func CORS(origins []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		
		// Check if origin is allowed
		allowed := false
		for _, o := range origins {
			if o == "*" || o == origin {
				allowed = true
				break
			}
		}

		if allowed {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Access-Control-Allow-Credentials", "true")
			c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
			c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization, X-Request-ID")
			c.Header("Access-Control-Expose-Headers", "Content-Length, X-Request-ID")
			c.Header("Access-Control-Max-Age", "43200") // 12 hours
		}

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

// RateLimiter middleware (simple in-memory implementation)
// In production, use Redis-based rate limiting
func RateLimiter(requestsPerMinute int) gin.HandlerFunc {
	// Simple implementation - in production use a proper rate limiter
	return func(c *gin.Context) {
		// TODO: Implement rate limiting with Redis
		c.Next()
	}
}

// Recovery middleware with custom error handling
func Recovery(logger *zap.SugaredLogger) gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				requestID, _ := c.Get("request_id")
				logger.Errorw("Panic recovered",
					"error", err,
					"request_id", requestID,
					"path", c.Request.URL.Path,
					"method", c.Request.Method,
				)

				c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
					"error":      "Internal server error",
					"request_id": requestID,
				})
			}
		}()
		c.Next()
	}
}

// GetUserID extracts user ID from context
func GetUserID(c *gin.Context) uuid.UUID {
	if userID, exists := c.Get("user_id"); exists {
		return userID.(uuid.UUID)
	}
	return uuid.Nil
}

// GetOrganizationID extracts organization ID from context
func GetOrganizationID(c *gin.Context) uuid.UUID {
	if orgID, exists := c.Get("organization_id"); exists {
		return orgID.(uuid.UUID)
	}
	return uuid.Nil
}

// GetUserEmail extracts user email from context
func GetUserEmail(c *gin.Context) string {
	if email, exists := c.Get("user_email"); exists {
		return email.(string)
	}
	return ""
}

// GetUserRole extracts user role from context
func GetUserRole(c *gin.Context) string {
	if role, exists := c.Get("user_role"); exists {
		return role.(string)
	}
	return ""
}

// GetRequestID extracts request ID from context
func GetRequestID(c *gin.Context) string {
	if requestID, exists := c.Get("request_id"); exists {
		return requestID.(string)
	}
	return ""
}

// GetAuditContext creates an audit context from the request
func GetAuditContext(c *gin.Context) services.AuditContext {
	var userID *uuid.UUID
	if id := GetUserID(c); id != uuid.Nil {
		userID = &id
	}

	return services.AuditContext{
		OrganizationID: GetOrganizationID(c),
		UserID:         userID,
		UserEmail:      GetUserEmail(c),
		UserIP:         c.ClientIP(),
		UserAgent:      c.Request.UserAgent(),
	}
}
