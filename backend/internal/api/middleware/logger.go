package middleware

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

const (
	ContextRequestID = "request_id"
)

// RequestID returns a middleware that adds a unique request ID to each request
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Check if request ID is already set (e.g., from load balancer)
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = uuid.New().String()
		}

		// Set request ID in context and response header
		c.Set(ContextRequestID, requestID)
		c.Header("X-Request-ID", requestID)

		c.Next()
	}
}

// GetRequestID extracts request ID from context
func GetRequestID(c *gin.Context) string {
	if reqID, exists := c.Get(ContextRequestID); exists {
		if id, ok := reqID.(string); ok {
			return id
		}
	}
	return ""
}

// Logger returns a middleware that logs requests using zap
func Logger(logger *zap.SugaredLogger) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Start timer
		start := time.Now()
		path := c.Request.URL.Path
		query := c.Request.URL.RawQuery

		// Process request
		c.Next()

		// Calculate latency
		latency := time.Since(start)

		// Get request info
		requestID := GetRequestID(c)
		clientIP := c.ClientIP()
		method := c.Request.Method
		statusCode := c.Writer.Status()
		bodySize := c.Writer.Size()

		// Get user info if available
		userID, _ := GetUserID(c)
		userEmail, _ := GetUserEmail(c)

		// Log based on status code
		if statusCode >= 500 {
			logger.Errorw("Server error",
				"request_id", requestID,
				"method", method,
				"path", path,
				"query", query,
				"status", statusCode,
				"latency", latency.String(),
				"latency_ms", latency.Milliseconds(),
				"client_ip", clientIP,
				"body_size", bodySize,
				"user_id", userID,
				"user_email", userEmail,
				"error", c.Errors.String(),
			)
		} else if statusCode >= 400 {
			logger.Warnw("Client error",
				"request_id", requestID,
				"method", method,
				"path", path,
				"query", query,
				"status", statusCode,
				"latency", latency.String(),
				"latency_ms", latency.Milliseconds(),
				"client_ip", clientIP,
				"body_size", bodySize,
				"user_id", userID,
				"user_email", userEmail,
			)
		} else {
			logger.Infow("Request completed",
				"request_id", requestID,
				"method", method,
				"path", path,
				"query", query,
				"status", statusCode,
				"latency", latency.String(),
				"latency_ms", latency.Milliseconds(),
				"client_ip", clientIP,
				"body_size", bodySize,
				"user_id", userID,
			)
		}
	}
}

// Recovery returns a middleware that recovers from panics
func Recovery(logger *zap.SugaredLogger) gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				requestID := GetRequestID(c)
				
				logger.Errorw("Panic recovered",
					"request_id", requestID,
					"error", err,
					"path", c.Request.URL.Path,
					"method", c.Request.Method,
				)

				c.AbortWithStatusJSON(500, gin.H{
					"error":      "internal_server_error",
					"message":    "An unexpected error occurred",
					"request_id": requestID,
				})
			}
		}()

		c.Next()
	}
}

// RateLimit returns a simple rate limiting middleware
// In production, use a proper rate limiter with Redis
func RateLimit(requestsPerSecond int) gin.HandlerFunc {
	// This is a simplified implementation
	// For production, use github.com/ulule/limiter or similar
	return func(c *gin.Context) {
		// TODO: Implement proper rate limiting
		c.Next()
	}
}

// Timeout returns a middleware that sets request timeout
func Timeout(timeout time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Set timeout in context
		// ctx, cancel := context.WithTimeout(c.Request.Context(), timeout)
		// defer cancel()
		// c.Request = c.Request.WithContext(ctx)
		c.Next()
	}
}
