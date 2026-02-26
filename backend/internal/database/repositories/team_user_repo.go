package repositories

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kubeatlas/kubeatlas/internal/models"
	"golang.org/x/crypto/bcrypt"
)

// ============================================
// Team Repository
// ============================================

// TeamRepository handles team database operations
type TeamRepository struct {
	*BaseRepository
	pool *pgxpool.Pool
}

// NewTeamRepository creates a new team repository
func NewTeamRepository(pool *pgxpool.Pool) *TeamRepository {
	return &TeamRepository{
		BaseRepository: NewBaseRepository(pool),
		pool:           pool,
	}
}

// Create creates a new team
func (r *TeamRepository) Create(ctx context.Context, team *models.Team) error {
	team.ID = uuid.New()
	team.CreatedAt = time.Now()
	team.UpdatedAt = time.Now()

	query := `
		INSERT INTO teams (
			id, organization_id, name, slug, description,
			parent_id, team_type, contact_email, contact_slack, metadata,
			created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`

	_, err := r.pool.Exec(ctx, query,
		team.ID, team.OrganizationID, team.Name, team.Slug, team.Description,
		team.ParentID, team.TeamType, team.ContactEmail, team.ContactSlack, team.Metadata,
		team.CreatedAt, team.UpdatedAt,
	)

	return err
}

// GetByID retrieves a team by ID
func (r *TeamRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Team, error) {
	query := `
		SELECT 
			id, organization_id, name, slug, description,
			parent_id, team_type, contact_email, contact_slack, metadata,
			created_at, updated_at
		FROM teams
		WHERE id = $1 AND deleted_at IS NULL
	`

	team := &models.Team{}
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&team.ID, &team.OrganizationID, &team.Name, &team.Slug, &team.Description,
		&team.ParentID, &team.TeamType, &team.ContactEmail, &team.ContactSlack, &team.Metadata,
		&team.CreatedAt, &team.UpdatedAt,
	)

	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	// Get member count
	countQuery := `SELECT COUNT(*) FROM team_members WHERE team_id = $1`
	r.pool.QueryRow(ctx, countQuery, id).Scan(&team.MemberCount)

	return team, nil
}

// List retrieves all teams for an organization
func (r *TeamRepository) List(ctx context.Context, orgID uuid.UUID) ([]models.Team, error) {
	query := `
		SELECT 
			t.id, t.organization_id, t.name, t.slug, t.description,
			t.parent_id, t.team_type, t.contact_email, t.contact_slack, t.metadata,
			t.created_at, t.updated_at,
			(SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id) as member_count
		FROM teams t
		WHERE t.organization_id = $1 AND t.deleted_at IS NULL
		ORDER BY t.name ASC
	`

	rows, err := r.pool.Query(ctx, query, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var teams []models.Team
	for rows.Next() {
		var t models.Team
		err := rows.Scan(
			&t.ID, &t.OrganizationID, &t.Name, &t.Slug, &t.Description,
			&t.ParentID, &t.TeamType, &t.ContactEmail, &t.ContactSlack, &t.Metadata,
			&t.CreatedAt, &t.UpdatedAt, &t.MemberCount,
		)
		if err != nil {
			return nil, err
		}
		teams = append(teams, t)
	}

	return teams, nil
}

// Update updates a team
func (r *TeamRepository) Update(ctx context.Context, team *models.Team) error {
	team.UpdatedAt = time.Now()

	query := `
		UPDATE teams SET
			name = $2, slug = $3, description = $4,
			parent_id = $5, team_type = $6,
			contact_email = $7, contact_slack = $8, metadata = $9,
			updated_at = $10
		WHERE id = $1 AND deleted_at IS NULL
	`

	result, err := r.pool.Exec(ctx, query,
		team.ID, team.Name, team.Slug, team.Description,
		team.ParentID, team.TeamType,
		team.ContactEmail, team.ContactSlack, team.Metadata,
		team.UpdatedAt,
	)

	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}

	return nil
}

// Delete soft deletes a team
func (r *TeamRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.SoftDelete(ctx, "teams", id)
}

// AddMember adds a user to a team
func (r *TeamRepository) AddMember(ctx context.Context, teamID, userID uuid.UUID, role string) error {
	query := `
		INSERT INTO team_members (id, team_id, user_id, role, joined_at)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (team_id, user_id) DO UPDATE SET role = $4
	`

	_, err := r.pool.Exec(ctx, query, uuid.New(), teamID, userID, role, time.Now())
	return err
}

// RemoveMember removes a user from a team
func (r *TeamRepository) RemoveMember(ctx context.Context, teamID, userID uuid.UUID) error {
	query := `DELETE FROM team_members WHERE team_id = $1 AND user_id = $2`
	_, err := r.pool.Exec(ctx, query, teamID, userID)
	return err
}

// GetMembers retrieves all members of a team
func (r *TeamRepository) GetMembers(ctx context.Context, teamID uuid.UUID) ([]models.TeamMember, error) {
	query := `
		SELECT 
			tm.id, tm.team_id, tm.user_id, tm.role, tm.joined_at,
			u.email, u.full_name, u.avatar_url
		FROM team_members tm
		JOIN users u ON tm.user_id = u.id
		WHERE tm.team_id = $1 AND u.deleted_at IS NULL
		ORDER BY tm.joined_at ASC
	`

	rows, err := r.pool.Query(ctx, query, teamID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var members []models.TeamMember
	for rows.Next() {
		var m models.TeamMember
		m.User = &models.User{}
		err := rows.Scan(
			&m.ID, &m.TeamID, &m.UserID, &m.Role, &m.JoinedAt,
			&m.User.Email, &m.User.FullName, &m.User.AvatarURL,
		)
		if err != nil {
			return nil, err
		}
		m.User.ID = m.UserID
		members = append(members, m)
	}

	return members, nil
}

// ============================================
// User Repository
// ============================================

// UserRepository handles user database operations
type UserRepository struct {
	*BaseRepository
	pool *pgxpool.Pool
}

// NewUserRepository creates a new user repository
func NewUserRepository(pool *pgxpool.Pool) *UserRepository {
	return &UserRepository{
		BaseRepository: NewBaseRepository(pool),
		pool:           pool,
	}
}

// Create creates a new user
func (r *UserRepository) Create(ctx context.Context, user *models.User, password string) error {
	user.ID = uuid.New()
	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()
	user.IsActive = true

	// Hash password if provided
	if password != "" {
		hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err != nil {
			return err
		}
		user.PasswordHash.String = string(hash)
		user.PasswordHash.Valid = true
	}

	query := `
		INSERT INTO users (
			id, organization_id, email, username, full_name,
			avatar_url, phone, password_hash, role, is_active,
			settings, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
	`

	_, err := r.pool.Exec(ctx, query,
		user.ID, user.OrganizationID, user.Email, user.Username, user.FullName,
		user.AvatarURL, user.Phone, user.PasswordHash, user.Role, user.IsActive,
		user.Settings, user.CreatedAt, user.UpdatedAt,
	)

	return err
}

// GetByID retrieves a user by ID
func (r *UserRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	query := `
		SELECT 
			id, organization_id, email, username, full_name,
			avatar_url, phone, role, is_active, last_login_at,
			settings, created_at, updated_at
		FROM users
		WHERE id = $1 AND deleted_at IS NULL
	`

	user := &models.User{}
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&user.ID, &user.OrganizationID, &user.Email, &user.Username, &user.FullName,
		&user.AvatarURL, &user.Phone, &user.Role, &user.IsActive, &user.LastLoginAt,
		&user.Settings, &user.CreatedAt, &user.UpdatedAt,
	)

	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return user, nil
}

// GetByEmail retrieves a user by email
func (r *UserRepository) GetByEmail(ctx context.Context, orgID uuid.UUID, email string) (*models.User, error) {
	query := `
		SELECT 
			id, organization_id, email, username, full_name,
			avatar_url, phone, password_hash, role, is_active, last_login_at,
			settings, created_at, updated_at
		FROM users
		WHERE organization_id = $1 AND email = $2 AND deleted_at IS NULL
	`

	user := &models.User{}
	err := r.pool.QueryRow(ctx, query, orgID, email).Scan(
		&user.ID, &user.OrganizationID, &user.Email, &user.Username, &user.FullName,
		&user.AvatarURL, &user.Phone, &user.PasswordHash, &user.Role, &user.IsActive, &user.LastLoginAt,
		&user.Settings, &user.CreatedAt, &user.UpdatedAt,
	)

	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return user, nil
}

// List retrieves all users for an organization
func (r *UserRepository) List(ctx context.Context, orgID uuid.UUID, p Pagination) (*PaginatedResult[models.User], error) {
	qb := NewQueryBuilder(`
		SELECT 
			id, organization_id, email, username, full_name,
			avatar_url, phone, role, is_active, last_login_at,
			settings, created_at, updated_at
		FROM users
	`)

	qb.Where("organization_id = ?", orgID)
	qb.Where("deleted_at IS NULL")

	if p.Sort == "" {
		p.Sort = "full_name"
		p.Order = "asc"
	}
	qb.Paginate(p)

	// Count
	countQuery, countArgs := qb.BuildCount()
	var total int64
	if err := r.pool.QueryRow(ctx, countQuery, countArgs...).Scan(&total); err != nil {
		return nil, err
	}

	// Data
	query, args := qb.Build()
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var u models.User
		err := rows.Scan(
			&u.ID, &u.OrganizationID, &u.Email, &u.Username, &u.FullName,
			&u.AvatarURL, &u.Phone, &u.Role, &u.IsActive, &u.LastLoginAt,
			&u.Settings, &u.CreatedAt, &u.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		users = append(users, u)
	}

	totalPages := int(total) / p.PageSize
	if int(total)%p.PageSize > 0 {
		totalPages++
	}

	return &PaginatedResult[models.User]{
		Items:      users,
		Total:      total,
		Page:       p.Page,
		PageSize:   p.PageSize,
		TotalPages: totalPages,
	}, nil
}

// Update updates a user
func (r *UserRepository) Update(ctx context.Context, user *models.User) error {
	user.UpdatedAt = time.Now()

	query := `
		UPDATE users SET
			username = $2, full_name = $3, avatar_url = $4,
			phone = $5, role = $6, is_active = $7,
			settings = $8, updated_at = $9
		WHERE id = $1 AND deleted_at IS NULL
	`

	result, err := r.pool.Exec(ctx, query,
		user.ID, user.Username, user.FullName, user.AvatarURL,
		user.Phone, user.Role, user.IsActive,
		user.Settings, user.UpdatedAt,
	)

	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}

	return nil
}

// UpdatePassword updates user password
func (r *UserRepository) UpdatePassword(ctx context.Context, id uuid.UUID, password string) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	query := `UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1`
	_, err = r.pool.Exec(ctx, query, id, string(hash))
	return err
}

// UpdateLastLogin updates last login timestamp
func (r *UserRepository) UpdateLastLogin(ctx context.Context, id uuid.UUID) error {
	query := `UPDATE users SET last_login_at = NOW() WHERE id = $1`
	_, err := r.pool.Exec(ctx, query, id)
	return err
}

// Delete soft deletes a user
func (r *UserRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.SoftDelete(ctx, "users", id)
}

// VerifyPassword verifies user password
func (r *UserRepository) VerifyPassword(user *models.User, password string) bool {
	if !user.PasswordHash.Valid {
		return false
	}
	err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash.String), []byte(password))
	return err == nil
}

// ============================================
// Business Unit Repository
// ============================================

// BusinessUnitRepository handles business unit database operations
type BusinessUnitRepository struct {
	*BaseRepository
	pool *pgxpool.Pool
}

// NewBusinessUnitRepository creates a new business unit repository
func NewBusinessUnitRepository(pool *pgxpool.Pool) *BusinessUnitRepository {
	return &BusinessUnitRepository{
		BaseRepository: NewBaseRepository(pool),
		pool:           pool,
	}
}

// Create creates a new business unit
func (r *BusinessUnitRepository) Create(ctx context.Context, bu *models.BusinessUnit) error {
	bu.ID = uuid.New()
	bu.CreatedAt = time.Now()
	bu.UpdatedAt = time.Now()

	query := `
		INSERT INTO business_units (
			id, organization_id, name, code, description,
			director_name, director_email, cost_center,
			parent_id, metadata, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`

	_, err := r.pool.Exec(ctx, query,
		bu.ID, bu.OrganizationID, bu.Name, bu.Code, bu.Description,
		bu.DirectorName, bu.DirectorEmail, bu.CostCenter,
		bu.ParentID, bu.Metadata, bu.CreatedAt, bu.UpdatedAt,
	)

	return err
}

// GetByID retrieves a business unit by ID
func (r *BusinessUnitRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.BusinessUnit, error) {
	query := `
		SELECT 
			id, organization_id, name, code, description,
			director_name, director_email, cost_center,
			parent_id, metadata, created_at, updated_at
		FROM business_units
		WHERE id = $1 AND deleted_at IS NULL
	`

	bu := &models.BusinessUnit{}
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&bu.ID, &bu.OrganizationID, &bu.Name, &bu.Code, &bu.Description,
		&bu.DirectorName, &bu.DirectorEmail, &bu.CostCenter,
		&bu.ParentID, &bu.Metadata, &bu.CreatedAt, &bu.UpdatedAt,
	)

	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return bu, nil
}

// List retrieves all business units for an organization
func (r *BusinessUnitRepository) List(ctx context.Context, orgID uuid.UUID) ([]models.BusinessUnit, error) {
	query := `
		SELECT 
			id, organization_id, name, code, description,
			director_name, director_email, cost_center,
			parent_id, metadata, created_at, updated_at
		FROM business_units
		WHERE organization_id = $1 AND deleted_at IS NULL
		ORDER BY name ASC
	`

	rows, err := r.pool.Query(ctx, query, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var units []models.BusinessUnit
	for rows.Next() {
		var bu models.BusinessUnit
		err := rows.Scan(
			&bu.ID, &bu.OrganizationID, &bu.Name, &bu.Code, &bu.Description,
			&bu.DirectorName, &bu.DirectorEmail, &bu.CostCenter,
			&bu.ParentID, &bu.Metadata, &bu.CreatedAt, &bu.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		units = append(units, bu)
	}

	return units, nil
}

// Update updates a business unit
func (r *BusinessUnitRepository) Update(ctx context.Context, bu *models.BusinessUnit) error {
	bu.UpdatedAt = time.Now()

	query := `
		UPDATE business_units SET
			name = $2, code = $3, description = $4,
			director_name = $5, director_email = $6, cost_center = $7,
			parent_id = $8, metadata = $9, updated_at = $10
		WHERE id = $1 AND deleted_at IS NULL
	`

	result, err := r.pool.Exec(ctx, query,
		bu.ID, bu.Name, bu.Code, bu.Description,
		bu.DirectorName, bu.DirectorEmail, bu.CostCenter,
		bu.ParentID, bu.Metadata, bu.UpdatedAt,
	)

	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}

	return nil
}

// Delete soft deletes a business unit
func (r *BusinessUnitRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.SoftDelete(ctx, "business_units", id)
}
