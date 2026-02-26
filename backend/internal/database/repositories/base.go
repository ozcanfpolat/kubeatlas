package repositories

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Pagination holds pagination parameters
type Pagination struct {
	Page     int    `json:"page"`
	PageSize int    `json:"page_size"`
	Sort     string `json:"sort"`
	Order    string `json:"order"` // asc, desc
}

// PaginatedResult holds paginated query results
type PaginatedResult[T any] struct {
	Items      []T   `json:"items"`
	Total      int64 `json:"total"`
	Page       int   `json:"page"`
	PageSize   int   `json:"page_size"`
	TotalPages int   `json:"total_pages"`
}

// Filter holds filter parameters
type Filter struct {
	Field    string
	Operator string // eq, ne, gt, gte, lt, lte, like, in, is_null
	Value    interface{}
}

// QueryBuilder helps build SQL queries
type QueryBuilder struct {
	baseQuery   string
	conditions  []string
	args        []interface{}
	argCounter  int
	orderBy     string
	limit       int
	offset      int
}

// NewQueryBuilder creates a new query builder
func NewQueryBuilder(baseQuery string) *QueryBuilder {
	return &QueryBuilder{
		baseQuery:  baseQuery,
		conditions: make([]string, 0),
		args:       make([]interface{}, 0),
		argCounter: 0,
	}
}

// Where adds a WHERE condition
func (qb *QueryBuilder) Where(condition string, args ...interface{}) *QueryBuilder {
	// Replace ? with $n
	for _, arg := range args {
		qb.argCounter++
		condition = strings.Replace(condition, "?", fmt.Sprintf("$%d", qb.argCounter), 1)
		qb.args = append(qb.args, arg)
	}
	qb.conditions = append(qb.conditions, condition)
	return qb
}

// WhereIf adds a WHERE condition if the condition is true
func (qb *QueryBuilder) WhereIf(shouldAdd bool, condition string, args ...interface{}) *QueryBuilder {
	if shouldAdd {
		return qb.Where(condition, args...)
	}
	return qb
}

// OrderBy sets the ORDER BY clause
func (qb *QueryBuilder) OrderBy(field, order string) *QueryBuilder {
	if order != "asc" && order != "desc" {
		order = "asc"
	}
	qb.orderBy = fmt.Sprintf("%s %s", field, order)
	return qb
}

// Limit sets the LIMIT clause
func (qb *QueryBuilder) Limit(limit int) *QueryBuilder {
	qb.limit = limit
	return qb
}

// Offset sets the OFFSET clause
func (qb *QueryBuilder) Offset(offset int) *QueryBuilder {
	qb.offset = offset
	return qb
}

// Paginate sets pagination
func (qb *QueryBuilder) Paginate(p Pagination) *QueryBuilder {
	if p.PageSize <= 0 {
		p.PageSize = 20
	}
	if p.PageSize > 100 {
		p.PageSize = 100
	}
	if p.Page <= 0 {
		p.Page = 1
	}
	
	qb.limit = p.PageSize
	qb.offset = (p.Page - 1) * p.PageSize
	
	if p.Sort != "" {
		qb.OrderBy(p.Sort, p.Order)
	}
	
	return qb
}

// Build constructs the final SQL query
func (qb *QueryBuilder) Build() (string, []interface{}) {
	query := qb.baseQuery
	
	if len(qb.conditions) > 0 {
		query += " WHERE " + strings.Join(qb.conditions, " AND ")
	}
	
	if qb.orderBy != "" {
		query += " ORDER BY " + qb.orderBy
	}
	
	if qb.limit > 0 {
		qb.argCounter++
		query += fmt.Sprintf(" LIMIT $%d", qb.argCounter)
		qb.args = append(qb.args, qb.limit)
	}
	
	if qb.offset > 0 {
		qb.argCounter++
		query += fmt.Sprintf(" OFFSET $%d", qb.argCounter)
		qb.args = append(qb.args, qb.offset)
	}
	
	return query, qb.args
}

// BuildCount constructs a COUNT query
func (qb *QueryBuilder) BuildCount() (string, []interface{}) {
	// Extract the FROM clause
	fromIndex := strings.Index(strings.ToUpper(qb.baseQuery), "FROM")
	if fromIndex == -1 {
		return "", nil
	}
	
	countQuery := "SELECT COUNT(*) " + qb.baseQuery[fromIndex:]
	
	if len(qb.conditions) > 0 {
		countQuery += " WHERE " + strings.Join(qb.conditions, " AND ")
	}
	
	// For count, we only need the WHERE args, not LIMIT/OFFSET
	return countQuery, qb.args[:len(qb.args)-countOffsetArgs(qb)]
}

func countOffsetArgs(qb *QueryBuilder) int {
	count := 0
	if qb.limit > 0 {
		count++
	}
	if qb.offset > 0 {
		count++
	}
	return count
}

// BaseRepository provides common database operations
type BaseRepository struct {
	pool *pgxpool.Pool
}

// NewBaseRepository creates a new base repository
func NewBaseRepository(pool *pgxpool.Pool) *BaseRepository {
	return &BaseRepository{pool: pool}
}

// GetByID retrieves a record by ID
func (r *BaseRepository) GetByID(ctx context.Context, table string, id uuid.UUID, dest interface{}) error {
	query := fmt.Sprintf("SELECT * FROM %s WHERE id = $1 AND deleted_at IS NULL", table)
	rows, err := r.pool.Query(ctx, query, id)
	if err != nil {
		return err
	}
	defer rows.Close()
	
	if !rows.Next() {
		return pgx.ErrNoRows
	}
	
	return rows.Scan(dest)
}

// SoftDelete performs a soft delete
func (r *BaseRepository) SoftDelete(ctx context.Context, table string, id uuid.UUID) error {
	query := fmt.Sprintf("UPDATE %s SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL", table)
	result, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		return err
	}
	
	if result.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	
	return nil
}

// HardDelete performs a hard delete
func (r *BaseRepository) HardDelete(ctx context.Context, table string, id uuid.UUID) error {
	query := fmt.Sprintf("DELETE FROM %s WHERE id = $1", table)
	result, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		return err
	}
	
	if result.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	
	return nil
}

// Exists checks if a record exists
func (r *BaseRepository) Exists(ctx context.Context, table string, id uuid.UUID) (bool, error) {
	var exists bool
	query := fmt.Sprintf("SELECT EXISTS(SELECT 1 FROM %s WHERE id = $1 AND deleted_at IS NULL)", table)
	err := r.pool.QueryRow(ctx, query, id).Scan(&exists)
	return exists, err
}

// Count returns the count of records matching conditions
func (r *BaseRepository) Count(ctx context.Context, table string, conditions string, args ...interface{}) (int64, error) {
	query := fmt.Sprintf("SELECT COUNT(*) FROM %s WHERE deleted_at IS NULL", table)
	if conditions != "" {
		query += " AND " + conditions
	}
	
	var count int64
	err := r.pool.QueryRow(ctx, query, args...).Scan(&count)
	return count, err
}
