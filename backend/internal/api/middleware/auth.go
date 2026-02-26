package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// Claims represents JWT claims
type Claims struct {
	jwt.RegisteredClaims
	UserID         uuid.UUID `json:"user_id"`
	OrganizationID uuid.UUID `json:"organization_id"`
	Email          string    `json:"email"`
	Role           string    `json:"role"`
}

// Context keys
const (
	ContextUserID         = "user_id"
	ContextOrganizationID = "organization_id"
	ContextUserEmail      = "user_email"
	ContextUserRole       = "user_role"
	ContextClaims         = "claims"
)

// Auth returns a JWT authentication middleware
func Auth(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":   "unauthorized",
				"message": "Authorization header is required",
			})
			return
		}

		// Check Bearer prefix
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":   "unauthorized",
				"message": "Invalid authorization header format",
			})
			return
		}

		tokenString := parts[1]

		// Parse and validate token
		token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(jwtSecret), nil
		})

		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":   "unauthorized",
				"message": "Invalid or expired token",
			})
			return
		}

		claims, ok := token.Claims.(*Claims)
		if !ok || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":   "unauthorized",
				"message": "Invalid token claims",
			})
			return
		}

		// Set user info in context
		c.Set(ContextUserID, claims.UserID)
		c.Set(ContextOrganizationID, claims.OrganizationID)
		c.Set(ContextUserEmail, claims.Email)
		c.Set(ContextUserRole, claims.Role)
		c.Set(ContextClaims, claims)

		c.Next()
	}
}

// OptionalAuth returns a middleware that extracts user info if token is present, but doesn't require it
func OptionalAuth(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.Next()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			c.Next()
			return
		}

		tokenString := parts[1]

		token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(jwtSecret), nil
		})

		if err != nil || !token.Valid {
			c.Next()
			return
		}

		claims, ok := token.Claims.(*Claims)
		if ok && token.Valid {
			c.Set(ContextUserID, claims.UserID)
			c.Set(ContextOrganizationID, claims.OrganizationID)
			c.Set(ContextUserEmail, claims.Email)
			c.Set(ContextUserRole, claims.Role)
			c.Set(ContextClaims, claims)
		}

		c.Next()
	}
}

// RequireRole returns a middleware that checks if user has required role
func RequireRole(roles ...string) gin.HandlerFunc {
	roleMap := make(map[string]bool)
	for _, role := range roles {
		roleMap[role] = true
	}

	return func(c *gin.Context) {
		userRole, exists := c.Get(ContextUserRole)
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":   "unauthorized",
				"message": "Authentication required",
			})
			return
		}

		role, ok := userRole.(string)
		if !ok || !roleMap[role] {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error":   "forbidden",
				"message": "Insufficient permissions",
			})
			return
		}

		c.Next()
	}
}

// RequireAdmin is a shortcut for RequireRole("admin")
func RequireAdmin() gin.HandlerFunc {
	return RequireRole("admin")
}

// RequireEditor is a shortcut for RequireRole("admin", "editor")
func RequireEditor() gin.HandlerFunc {
	return RequireRole("admin", "editor")
}

// GetUserID extracts user ID from context
func GetUserID(c *gin.Context) (uuid.UUID, bool) {
	userID, exists := c.Get(ContextUserID)
	if !exists {
		return uuid.Nil, false
	}
	id, ok := userID.(uuid.UUID)
	return id, ok
}

// GetOrganizationID extracts organization ID from context
func GetOrganizationID(c *gin.Context) (uuid.UUID, bool) {
	orgID, exists := c.Get(ContextOrganizationID)
	if !exists {
		return uuid.Nil, false
	}
	id, ok := orgID.(uuid.UUID)
	return id, ok
}

// GetUserEmail extracts user email from context
func GetUserEmail(c *gin.Context) (string, bool) {
	email, exists := c.Get(ContextUserEmail)
	if !exists {
		return "", false
	}
	e, ok := email.(string)
	return e, ok
}

// GetUserRole extracts user role from context
func GetUserRole(c *gin.Context) (string, bool) {
	role, exists := c.Get(ContextUserRole)
	if !exists {
		return "", false
	}
	r, ok := role.(string)
	return r, ok
}

// GetClaims extracts full claims from context
func GetClaims(c *gin.Context) (*Claims, bool) {
	claims, exists := c.Get(ContextClaims)
	if !exists {
		return nil, false
	}
	cl, ok := claims.(*Claims)
	return cl, ok
}
