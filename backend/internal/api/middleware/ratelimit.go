package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// RateLimiter implements token bucket algorithm
type RateLimiter struct {
	requests map[string]*clientLimit
	mu       sync.RWMutex
	rate     int           // requests per window
	window   time.Duration // time window
}

type clientLimit struct {
	tokens    int
	lastCheck time.Time
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(rate int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		requests: make(map[string]*clientLimit),
		rate:     rate,
		window:   window,
	}
	
	// Cleanup old entries periodically
	go rl.cleanup()
	
	return rl
}

// Allow checks if request is allowed
func (rl *RateLimiter) Allow(clientID string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	client, exists := rl.requests[clientID]

	if !exists {
		rl.requests[clientID] = &clientLimit{
			tokens:    rl.rate - 1,
			lastCheck: now,
		}
		return true
	}

	// Calculate tokens to add based on time passed
	elapsed := now.Sub(client.lastCheck)
	tokensToAdd := int(elapsed / rl.window * time.Duration(rl.rate))
	
	if tokensToAdd > 0 {
		client.tokens = min(rl.rate, client.tokens+tokensToAdd)
		client.lastCheck = now
	}

	if client.tokens > 0 {
		client.tokens--
		return true
	}

	return false
}

// cleanup removes old entries periodically
func (rl *RateLimiter) cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		rl.mu.Lock()
		now := time.Now()
		for id, client := range rl.requests {
			if now.Sub(client.lastCheck) > rl.window*2 {
				delete(rl.requests, id)
			}
		}
		rl.mu.Unlock()
	}
}

// RateLimit returns a middleware that limits requests
func RateLimiterMiddleware(rate int, window time.Duration) gin.HandlerFunc {
	limiter := NewRateLimiter(rate, window)

	return func(c *gin.Context) {
		// Use client IP as identifier (or API key if available)
		clientID := c.ClientIP()
		
		// Check for API key header
		if apiKey := c.GetHeader("X-API-Key"); apiKey != "" {
			clientID = apiKey
		}

		if !limiter.Allow(clientID) {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":   "rate_limit_exceeded",
				"message": "Too many requests. Please try again later.",
				"retry_after": window.Seconds(),
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// RateLimitByUser returns a middleware that limits requests per user
func RateLimiterByUser(rate int, window time.Duration) gin.HandlerFunc {
	limiter := NewRateLimiter(rate, window)

	return func(c *gin.Context) {
		userID, exists := GetUserID(c)
		if !exists {
			c.Next()
			return
		}

		if !limiter.Allow(userID.String()) {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":   "rate_limit_exceeded",
				"message": "Too many requests. Please try again later.",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// LoginRateLimiter returns a strict rate limiter for login attempts (brute force protection)
// Default: 5 attempts per 15 minutes per IP
func LoginRateLimiter() gin.HandlerFunc {
	limiter := NewRateLimiter(5, 15*time.Minute)

	return func(c *gin.Context) {
		clientIP := c.ClientIP()

		if !limiter.Allow(clientIP) {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":       "too_many_login_attempts",
				"message":     "Too many login attempts. Please try again later.",
				"retry_after": 900, // 15 minutes in seconds
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// PasswordResetRateLimiter returns a rate limiter for password reset requests
// Default: 3 attempts per hour per IP
func PasswordResetRateLimiter() gin.HandlerFunc {
	limiter := NewRateLimiter(3, time.Hour)

	return func(c *gin.Context) {
		clientIP := c.ClientIP()

		if !limiter.Allow(clientIP) {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":       "too_many_reset_attempts",
				"message":     "Too many password reset attempts. Please try again later.",
				"retry_after": 3600, // 1 hour in seconds
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
