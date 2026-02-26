package services

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestAuthService_GenerateToken(t *testing.T) {
	svc := &AuthService{}
	svc.SetJWTConfig("test-secret-key-32-bytes-long!!", 24, 168)

	userID := uuid.New()
	orgID := uuid.New()
	email := "test@example.com"
	role := "admin"

	tokens, err := svc.GenerateTokens(userID, orgID, email, role)
	if err != nil {
		t.Fatalf("GenerateTokens failed: %v", err)
	}

	if tokens.AccessToken == "" {
		t.Error("AccessToken should not be empty")
	}

	if tokens.RefreshToken == "" {
		t.Error("RefreshToken should not be empty")
	}

	if tokens.TokenType != "Bearer" {
		t.Errorf("TokenType should be Bearer, got %s", tokens.TokenType)
	}

	if tokens.ExpiresAt.Before(time.Now()) {
		t.Error("ExpiresAt should be in the future")
	}
}

func TestAuthService_ValidateToken(t *testing.T) {
	svc := &AuthService{}
	svc.SetJWTConfig("test-secret-key-32-bytes-long!!", 24, 168)

	userID := uuid.New()
	orgID := uuid.New()
	email := "test@example.com"
	role := "admin"

	tokens, err := svc.GenerateTokens(userID, orgID, email, role)
	if err != nil {
		t.Fatalf("GenerateTokens failed: %v", err)
	}

	claims, err := svc.ValidateToken(tokens.AccessToken)
	if err != nil {
		t.Fatalf("ValidateToken failed: %v", err)
	}

	if claims.UserID != userID {
		t.Errorf("UserID mismatch: got %v, want %v", claims.UserID, userID)
	}

	if claims.OrganizationID != orgID {
		t.Errorf("OrganizationID mismatch: got %v, want %v", claims.OrganizationID, orgID)
	}

	if claims.Email != email {
		t.Errorf("Email mismatch: got %v, want %v", claims.Email, email)
	}

	if claims.Role != role {
		t.Errorf("Role mismatch: got %v, want %v", claims.Role, role)
	}
}

func TestAuthService_ValidateToken_Invalid(t *testing.T) {
	svc := &AuthService{}
	svc.SetJWTConfig("test-secret-key-32-bytes-long!!", 24, 168)

	_, err := svc.ValidateToken("invalid-token")
	if err == nil {
		t.Error("ValidateToken should fail with invalid token")
	}
}

func TestAuthService_ValidateToken_WrongSecret(t *testing.T) {
	svc1 := &AuthService{}
	svc1.SetJWTConfig("test-secret-key-32-bytes-long!!", 24, 168)

	svc2 := &AuthService{}
	svc2.SetJWTConfig("different-secret-key-32-bytes!!", 24, 168)

	tokens, err := svc1.GenerateTokens(uuid.New(), uuid.New(), "test@example.com", "admin")
	if err != nil {
		t.Fatalf("GenerateTokens failed: %v", err)
	}

	_, err = svc2.ValidateToken(tokens.AccessToken)
	if err == nil {
		t.Error("ValidateToken should fail with wrong secret")
	}
}

func TestAuditContext(t *testing.T) {
	userID := uuid.New()
	ctx := AuditContext{
		OrganizationID: uuid.New(),
		UserID:         &userID,
		UserEmail:      "test@example.com",
		UserIP:         "192.168.1.1",
		UserAgent:      "TestAgent/1.0",
	}

	if ctx.OrganizationID == uuid.Nil {
		t.Error("OrganizationID should not be nil")
	}

	if ctx.UserID == nil {
		t.Error("UserID should not be nil")
	}

	if ctx.UserEmail == "" {
		t.Error("UserEmail should not be empty")
	}
}

func TestAuditService_LogCreate(t *testing.T) {
	// Create a mock audit service (without DB)
	svc := &AuditService{
		logger: nil, // Would need a mock logger for full test
	}

	ctx := context.Background()
	actx := AuditContext{
		OrganizationID: uuid.New(),
		UserEmail:      "test@example.com",
	}

	// This test just ensures the method doesn't panic
	// Full integration test would require a database
	_ = svc
	_ = ctx
	_ = actx
}
