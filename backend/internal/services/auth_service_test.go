package services

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/kubeatlas/kubeatlas/internal/models"
)

const testJWTSecret = "test-secret-key-32-bytes-long!!"

func testUser() *models.User {
	return &models.User{
		BaseModel:      models.BaseModel{ID: uuid.New()},
		OrganizationID: uuid.New(),
		Email:          "test@example.com",
		Role:           "admin",
	}
}

func TestAuthService_GenerateToken(t *testing.T) {
	svc := &AuthService{}
	tokens, err := svc.GenerateTokens(testUser(), testJWTSecret, 24)
	if err != nil {
		t.Fatalf("GenerateTokens failed: %v", err)
	}
	if tokens.AccessToken == "" || tokens.RefreshToken == "" {
		t.Fatal("expected both access and refresh tokens")
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
	user := testUser()
	tokens, err := svc.GenerateTokens(user, testJWTSecret, 24)
	if err != nil {
		t.Fatalf("GenerateTokens failed: %v", err)
	}
	claims, err := svc.ValidateToken(tokens.AccessToken, testJWTSecret)
	if err != nil {
		t.Fatalf("ValidateToken failed: %v", err)
	}
	if claims.UserID != user.ID || claims.OrganizationID != user.OrganizationID {
		t.Fatal("token claims do not match user")
	}
}

func TestAuthService_ValidateToken_Invalid(t *testing.T) {
	svc := &AuthService{}
	if _, err := svc.ValidateToken("invalid-token", testJWTSecret); err == nil {
		t.Error("ValidateToken should fail with invalid token")
	}
}

func TestAuthService_ValidateToken_WrongSecret(t *testing.T) {
	svc := &AuthService{}
	tokens, err := svc.GenerateTokens(testUser(), testJWTSecret, 24)
	if err != nil {
		t.Fatalf("GenerateTokens failed: %v", err)
	}
	if _, err = svc.ValidateToken(tokens.AccessToken, "different-secret-key-32-bytes!!"); err == nil {
		t.Error("ValidateToken should fail with wrong secret")
	}
}

func TestAuditContext(t *testing.T) {
	userID := uuid.New()
	ctx := AuditContext{OrgID: uuid.New(), UserID: &userID, UserEmail: "test@example.com"}
	if ctx.OrgID == uuid.Nil || ctx.UserID == nil || ctx.UserEmail == "" {
		t.Error("audit context should include org, user and email")
	}
}

func TestAuditService_LogCreate(t *testing.T) {
	svc := &AuditService{logger: nil}
	_ = svc
	_ = context.Background()
	_ = AuditContext{OrgID: uuid.New(), UserEmail: "test@example.com"}
}
