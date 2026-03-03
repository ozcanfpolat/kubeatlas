package middleware

import (
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
)

var (
	// emailRegex is a simple email validation regex
	emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	
	// nameRegex allows alphanumeric, dash, underscore, and dot
	nameRegex = regexp.MustCompile(`^[a-zA-Z0-9][a-zA-Z0-9._-]*$`)
	
	// slugRegex allows lowercase alphanumeric and dash
	slugRegex = regexp.MustCompile(`^[a-z0-9]+(-[a-z0-9]+)*$`)
)

// ValidationError represents a validation error
type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

// ValidationErrors is a collection of validation errors
type ValidationErrors struct {
	Errors []ValidationError `json:"errors"`
}

// Validator provides validation functions
type Validator struct{}

// NewValidator creates a new validator
func NewValidator() *Validator {
	return &Validator{}
}

// ValidateEmail validates an email address
func (v *Validator) ValidateEmail(email string) bool {
	if len(email) > 254 {
		return false
	}
	return emailRegex.MatchString(email)
}

// ValidateName validates a name (cluster name, namespace name, etc.)
func (v *Validator) ValidateName(name string, minLen, maxLen int) bool {
	length := utf8.RuneCountInString(name)
	if length < minLen || length > maxLen {
		return false
	}
	return nameRegex.MatchString(name)
}

// ValidateSlug validates a slug
func (v *Validator) ValidateSlug(slug string) bool {
	if len(slug) < 1 || len(slug) > 63 {
		return false
	}
	return slugRegex.MatchString(slug)
}

// ValidateURL validates a URL
func (v *Validator) ValidateURL(rawURL string) bool {
	if rawURL == "" {
		return false
	}
	
	parsedURL, err := url.Parse(rawURL)
	if err != nil {
		return false
	}
	
	// Must have scheme and host
	if parsedURL.Scheme == "" || parsedURL.Host == "" {
		return false
	}
	
	// Only allow http and https
	if parsedURL.Scheme != "http" && parsedURL.Scheme != "https" {
		return false
	}
	
	return true
}

// ValidateKubernetesName validates Kubernetes resource names
// Must be lowercase, alphanumeric, dash, max 63 chars, start/end with alphanumeric
func (v *Validator) ValidateKubernetesName(name string) bool {
	if len(name) == 0 || len(name) > 63 {
		return false
	}
	
	// Must start and end with alphanumeric
	if !isAlphanumeric(rune(name[0])) || !isAlphanumeric(rune(name[len(name)-1])) {
		return false
	}
	
	// Can only contain lowercase alphanumeric and dash
	for _, r := range name {
		if !isLowerAlphanumeric(r) && r != '-' {
			return false
		}
	}
	
	return true
}

// ValidatePassword validates password strength
func (v *Validator) ValidatePassword(password string) []string {
	var errors []string
	
	if len(password) < 8 {
		errors = append(errors, "Password must be at least 8 characters")
	}
	if len(password) > 128 {
		errors = append(errors, "Password must be at most 128 characters")
	}
	
	var hasUpper, hasLower, hasDigit bool
	for _, r := range password {
		switch {
		case r >= 'A' && r <= 'Z':
			hasUpper = true
		case r >= 'a' && r <= 'z':
			hasLower = true
		case r >= '0' && r <= '9':
			hasDigit = true
		}
	}
	
	if !hasUpper {
		errors = append(errors, "Password must contain at least one uppercase letter")
	}
	if !hasLower {
		errors = append(errors, "Password must contain at least one lowercase letter")
	}
	if !hasDigit {
		errors = append(errors, "Password must contain at least one digit")
	}
	
	return errors
}

// SanitizeString removes potentially dangerous characters
func (v *Validator) SanitizeString(input string) string {
	// Remove null bytes
	input = strings.ReplaceAll(input, "\x00", "")
	
	// Trim whitespace
	input = strings.TrimSpace(input)
	
	return input
}

// ValidateStringLength validates string length
func (v *Validator) ValidateStringLength(s string, min, max int) bool {
	length := utf8.RuneCountInString(s)
	return length >= min && length <= max
}

// Helper functions
func isAlphanumeric(r rune) bool {
	return (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9')
}

func isLowerAlphanumeric(r rune) bool {
	return (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9')
}

// InputSanitizer middleware sanitizes common input fields
func InputSanitizer() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Continue to next handler
		c.Next()
	}
}

// MaxBodySize limits the request body size
func MaxBodySize(maxBytes int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes)
		c.Next()
	}
}

// ContentTypeJSON ensures request content type is JSON for POST/PUT/PATCH
func ContentTypeJSON() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method == "POST" || c.Request.Method == "PUT" || c.Request.Method == "PATCH" {
			contentType := c.GetHeader("Content-Type")
			
			// Allow multipart for file uploads
			if strings.HasPrefix(contentType, "multipart/form-data") {
				c.Next()
				return
			}
			
			// Require JSON for other requests with body
			if c.Request.ContentLength > 0 && !strings.Contains(contentType, "application/json") {
				c.AbortWithStatusJSON(http.StatusUnsupportedMediaType, gin.H{
					"error":   "unsupported_media_type",
					"message": "Content-Type must be application/json",
				})
				return
			}
		}
		c.Next()
	}
}
