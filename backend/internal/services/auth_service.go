package services

import (
	"context"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/kubeatlas/kubeatlas/internal/database/repositories"
	"github.com/kubeatlas/kubeatlas/internal/models"
	"go.uber.org/zap"
)

var (
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrUserNotFound       = errors.New("user not found")
	ErrUserInactive       = errors.New("user account is inactive")
	ErrInvalidToken       = errors.New("invalid or expired token")
)

type AuthService struct {
	userRepo *repositories.UserRepository
	logger   *zap.SugaredLogger
}

func NewAuthService(userRepo *repositories.UserRepository, logger *zap.SugaredLogger) *AuthService {
	return &AuthService{userRepo: userRepo, logger: logger}
}

type Claims struct {
	UserID         uuid.UUID `json:"user_id"`
	OrganizationID uuid.UUID `json:"organization_id"`
	Email          string    `json:"email"`
	Role           string    `json:"role"`
	jwt.RegisteredClaims
}

type TokenPair struct {
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	ExpiresAt    time.Time `json:"expires_at"`
	TokenType    string    `json:"token_type"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

func (s *AuthService) Login(ctx context.Context, orgID uuid.UUID, req LoginRequest, jwtSecret string, expirationHours int) (*TokenPair, *models.User, error) {
	user, err := s.userRepo.GetByEmail(ctx, orgID, req.Email)
	if err != nil {
		return nil, nil, err
	}
	if user == nil {
		return nil, nil, ErrInvalidCredentials
	}
	if !user.IsActive {
		return nil, nil, ErrUserInactive
	}
	if !s.userRepo.VerifyPassword(user, req.Password) {
		return nil, nil, ErrInvalidCredentials
	}

	s.userRepo.UpdateLastLogin(ctx, user.ID)

	tokens, err := s.GenerateTokens(user, jwtSecret, expirationHours)
	if err != nil {
		return nil, nil, err
	}

	s.logger.Infow("User logged in", "user_id", user.ID, "email", user.Email)
	return tokens, user, nil
}

func (s *AuthService) GenerateTokens(user *models.User, jwtSecret string, expirationHours int) (*TokenPair, error) {
	now := time.Now()
	accessExpiry := now.Add(time.Duration(expirationHours) * time.Hour)
	refreshExpiry := now.Add(time.Duration(expirationHours*7) * time.Hour)

	accessClaims := &Claims{
		UserID:         user.ID,
		OrganizationID: user.OrganizationID,
		Email:          user.Email,
		Role:           user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(accessExpiry),
			IssuedAt:  jwt.NewNumericDate(now),
			Issuer:    "kubeatlas",
			Subject:   user.ID.String(),
		},
	}

	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	accessTokenString, err := accessToken.SignedString([]byte(jwtSecret))
	if err != nil {
		return nil, err
	}

	refreshClaims := &Claims{
		UserID:         user.ID,
		OrganizationID: user.OrganizationID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(refreshExpiry),
			IssuedAt:  jwt.NewNumericDate(now),
			Issuer:    "kubeatlas-refresh",
			Subject:   user.ID.String(),
		},
	}

	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshTokenString, err := refreshToken.SignedString([]byte(jwtSecret))
	if err != nil {
		return nil, err
	}

	return &TokenPair{
		AccessToken:  accessTokenString,
		RefreshToken: refreshTokenString,
		ExpiresAt:    accessExpiry,
		TokenType:    "Bearer",
	}, nil
}

func (s *AuthService) ValidateToken(tokenString, jwtSecret string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return []byte(jwtSecret), nil
	})

	if err != nil {
		return nil, ErrInvalidToken
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, ErrInvalidToken
	}

	return claims, nil
}

func (s *AuthService) RefreshToken(ctx context.Context, refreshTokenString, jwtSecret string, expirationHours int) (*TokenPair, error) {
	claims, err := s.ValidateToken(refreshTokenString, jwtSecret)
	if err != nil {
		return nil, err
	}

	if claims.Issuer != "kubeatlas-refresh" {
		return nil, ErrInvalidToken
	}

	user, err := s.userRepo.GetByID(ctx, claims.UserID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, ErrUserNotFound
	}
	if !user.IsActive {
		return nil, ErrUserInactive
	}

	return s.GenerateTokens(user, jwtSecret, expirationHours)
}

func (s *AuthService) GetUserFromToken(ctx context.Context, claims *Claims) (*models.User, error) {
	return s.userRepo.GetByID(ctx, claims.UserID)
}
