package services

import (
	"context"
	"database/sql"
	"errors"

	"github.com/google/uuid"
	"github.com/kubeatlas/kubeatlas/internal/database/repositories"
	"github.com/kubeatlas/kubeatlas/internal/models"
	"go.uber.org/zap"
)

var (
	ErrTeamNotFound         = errors.New("team not found")
	ErrBusinessUnitNotFound = errors.New("business unit not found")
)

// ============================================
// Team Service
// ============================================

type TeamService struct {
	repo     *repositories.TeamRepository
	auditSvc *AuditService
	logger   *zap.SugaredLogger
}

func NewTeamService(repo *repositories.TeamRepository, auditSvc *AuditService, logger *zap.SugaredLogger) *TeamService {
	return &TeamService{repo: repo, auditSvc: auditSvc, logger: logger}
}

type CreateTeamRequest struct {
	Name         string `json:"name" binding:"required"`
	Slug         string `json:"slug" binding:"required"`
	Description  string `json:"description"`
	TeamType     string `json:"team_type"`
	ContactEmail string `json:"contact_email"`
	ContactSlack string `json:"contact_slack"`
}

func (s *TeamService) Create(ctx context.Context, ac AuditContext, req CreateTeamRequest) (*models.Team, error) {
	team := &models.Team{
		OrganizationID: ac.OrgID,
		Name:           req.Name,
		Slug:           req.Slug,
		TeamType:       req.TeamType,
		Metadata:       make(models.JSONMap),
	}
	if req.Description != "" {
		team.Description = sql.NullString{String: req.Description, Valid: true}
	}
	if req.ContactEmail != "" {
		team.ContactEmail = sql.NullString{String: req.ContactEmail, Valid: true}
	}
	if req.ContactSlack != "" {
		team.ContactSlack = sql.NullString{String: req.ContactSlack, Valid: true}
	}
	if team.TeamType == "" {
		team.TeamType = "team"
	}

	if err := s.repo.Create(ctx, team); err != nil {
		return nil, err
	}
	s.auditSvc.LogCreate(ctx, ac, "team", team.ID, team.Name, nil)
	return team, nil
}

func (s *TeamService) GetByID(ctx context.Context, id uuid.UUID) (*models.Team, error) {
	team, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if team == nil {
		return nil, ErrTeamNotFound
	}
	return team, nil
}

func (s *TeamService) List(ctx context.Context, orgID uuid.UUID) ([]models.Team, error) {
	return s.repo.List(ctx, orgID)
}

func (s *TeamService) Update(ctx context.Context, ac AuditContext, id uuid.UUID, req CreateTeamRequest) (*models.Team, error) {
	team, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if team == nil {
		return nil, ErrTeamNotFound
	}

	team.Name = req.Name
	team.Slug = req.Slug
	if req.Description != "" {
		team.Description = sql.NullString{String: req.Description, Valid: true}
	}
	if req.TeamType != "" {
		team.TeamType = req.TeamType
	}
	if req.ContactEmail != "" {
		team.ContactEmail = sql.NullString{String: req.ContactEmail, Valid: true}
	}
	if req.ContactSlack != "" {
		team.ContactSlack = sql.NullString{String: req.ContactSlack, Valid: true}
	}

	if err := s.repo.Update(ctx, team); err != nil {
		return nil, err
	}
	s.auditSvc.LogUpdate(ctx, ac, "team", team.ID, team.Name, nil, nil)
	return team, nil
}

func (s *TeamService) Delete(ctx context.Context, ac AuditContext, id uuid.UUID) error {
	if err := s.repo.Delete(ctx, id); err != nil {
		return err
	}
	s.auditSvc.LogDelete(ctx, ac, "team", id, "")
	return nil
}

func (s *TeamService) AddMember(ctx context.Context, ac AuditContext, teamID, userID uuid.UUID, role string) error {
	if err := s.repo.AddMember(ctx, teamID, userID, role); err != nil {
		return err
	}
	s.auditSvc.LogAction(ctx, ac, "add_member", "team", teamID, "", "Added member to team")
	return nil
}

func (s *TeamService) RemoveMember(ctx context.Context, ac AuditContext, teamID, userID uuid.UUID) error {
	if err := s.repo.RemoveMember(ctx, teamID, userID); err != nil {
		return err
	}
	s.auditSvc.LogAction(ctx, ac, "remove_member", "team", teamID, "", "Removed member from team")
	return nil
}

func (s *TeamService) GetMembers(ctx context.Context, teamID uuid.UUID) ([]models.TeamMember, error) {
	return s.repo.GetMembers(ctx, teamID)
}

// ============================================
// User Service
// ============================================

type UserService struct {
	repo     *repositories.UserRepository
	auditSvc *AuditService
	logger   *zap.SugaredLogger
}

func NewUserService(repo *repositories.UserRepository, auditSvc *AuditService, logger *zap.SugaredLogger) *UserService {
	return &UserService{repo: repo, auditSvc: auditSvc, logger: logger}
}

type CreateUserRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Username string `json:"username"`
	FullName string `json:"full_name"`
	Phone    string `json:"phone"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

func (s *UserService) Create(ctx context.Context, ac AuditContext, req CreateUserRequest) (*models.User, error) {
	user := &models.User{
		OrganizationID: ac.OrgID,
		Email:          req.Email,
		Role:           req.Role,
		IsActive:       true,
		Settings:       make(models.JSONMap),
	}
	if req.Username != "" {
		user.Username = sql.NullString{String: req.Username, Valid: true}
	}
	if req.FullName != "" {
		user.FullName = sql.NullString{String: req.FullName, Valid: true}
	}
	if req.Phone != "" {
		user.Phone = sql.NullString{String: req.Phone, Valid: true}
	}
	if user.Role == "" {
		user.Role = "viewer"
	}

	if err := s.repo.Create(ctx, user, req.Password); err != nil {
		return nil, err
	}
	s.auditSvc.LogCreate(ctx, ac, "user", user.ID, user.Email, nil)
	return user, nil
}

func (s *UserService) GetByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *UserService) List(ctx context.Context, orgID uuid.UUID, p repositories.Pagination) (*repositories.PaginatedResult[models.User], error) {
	return s.repo.List(ctx, orgID, p)
}

func (s *UserService) Update(ctx context.Context, ac AuditContext, id uuid.UUID, req CreateUserRequest) (*models.User, error) {
	user, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, ErrUserNotFound
	}

	if req.Username != "" {
		user.Username = sql.NullString{String: req.Username, Valid: true}
	}
	if req.FullName != "" {
		user.FullName = sql.NullString{String: req.FullName, Valid: true}
	}
	if req.Phone != "" {
		user.Phone = sql.NullString{String: req.Phone, Valid: true}
	}
	if req.Role != "" {
		user.Role = req.Role
	}

	if err := s.repo.Update(ctx, user); err != nil {
		return nil, err
	}
	s.auditSvc.LogUpdate(ctx, ac, "user", user.ID, user.Email, nil, nil)
	return user, nil
}

func (s *UserService) Delete(ctx context.Context, ac AuditContext, id uuid.UUID) error {
	if err := s.repo.Delete(ctx, id); err != nil {
		return err
	}
	s.auditSvc.LogDelete(ctx, ac, "user", id, "")
	return nil
}

// ============================================
// Business Unit Service
// ============================================

type BusinessUnitService struct {
	repo     *repositories.BusinessUnitRepository
	auditSvc *AuditService
	logger   *zap.SugaredLogger
}

func NewBusinessUnitService(repo *repositories.BusinessUnitRepository, auditSvc *AuditService, logger *zap.SugaredLogger) *BusinessUnitService {
	return &BusinessUnitService{repo: repo, auditSvc: auditSvc, logger: logger}
}

type CreateBusinessUnitRequest struct {
	Name          string `json:"name" binding:"required"`
	Code          string `json:"code"`
	Description   string `json:"description"`
	DirectorName  string `json:"director_name"`
	DirectorEmail string `json:"director_email"`
	CostCenter    string `json:"cost_center"`
}

func (s *BusinessUnitService) Create(ctx context.Context, ac AuditContext, req CreateBusinessUnitRequest) (*models.BusinessUnit, error) {
	bu := &models.BusinessUnit{
		OrganizationID: ac.OrgID,
		Name:           req.Name,
		Metadata:       make(models.JSONMap),
	}
	if req.Code != "" {
		bu.Code = sql.NullString{String: req.Code, Valid: true}
	}
	if req.Description != "" {
		bu.Description = sql.NullString{String: req.Description, Valid: true}
	}
	if req.DirectorName != "" {
		bu.DirectorName = sql.NullString{String: req.DirectorName, Valid: true}
	}
	if req.DirectorEmail != "" {
		bu.DirectorEmail = sql.NullString{String: req.DirectorEmail, Valid: true}
	}
	if req.CostCenter != "" {
		bu.CostCenter = sql.NullString{String: req.CostCenter, Valid: true}
	}

	if err := s.repo.Create(ctx, bu); err != nil {
		return nil, err
	}
	s.auditSvc.LogCreate(ctx, ac, "business_unit", bu.ID, bu.Name, nil)
	return bu, nil
}

func (s *BusinessUnitService) GetByID(ctx context.Context, id uuid.UUID) (*models.BusinessUnit, error) {
	bu, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if bu == nil {
		return nil, ErrBusinessUnitNotFound
	}
	return bu, nil
}

func (s *BusinessUnitService) List(ctx context.Context, orgID uuid.UUID) ([]models.BusinessUnit, error) {
	return s.repo.List(ctx, orgID)
}

func (s *BusinessUnitService) Update(ctx context.Context, ac AuditContext, id uuid.UUID, req CreateBusinessUnitRequest) (*models.BusinessUnit, error) {
	bu, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if bu == nil {
		return nil, ErrBusinessUnitNotFound
	}

	bu.Name = req.Name
	if req.Code != "" {
		bu.Code = sql.NullString{String: req.Code, Valid: true}
	}
	if req.Description != "" {
		bu.Description = sql.NullString{String: req.Description, Valid: true}
	}
	if req.DirectorName != "" {
		bu.DirectorName = sql.NullString{String: req.DirectorName, Valid: true}
	}
	if req.DirectorEmail != "" {
		bu.DirectorEmail = sql.NullString{String: req.DirectorEmail, Valid: true}
	}
	if req.CostCenter != "" {
		bu.CostCenter = sql.NullString{String: req.CostCenter, Valid: true}
	}

	if err := s.repo.Update(ctx, bu); err != nil {
		return nil, err
	}
	s.auditSvc.LogUpdate(ctx, ac, "business_unit", bu.ID, bu.Name, nil, nil)
	return bu, nil
}

func (s *BusinessUnitService) Delete(ctx context.Context, ac AuditContext, id uuid.UUID) error {
	if err := s.repo.Delete(ctx, id); err != nil {
		return err
	}
	s.auditSvc.LogDelete(ctx, ac, "business_unit", id, "")
	return nil
}
