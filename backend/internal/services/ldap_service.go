package services

import (
	"context"
	"crypto/tls"
	"fmt"
	"strings"
	"time"

	"github.com/go-ldap/ldap/v3"
	"github.com/google/uuid"
	"github.com/kubeatlas/kubeatlas/internal/database/repositories"
	"github.com/kubeatlas/kubeatlas/internal/models"
	"go.uber.org/zap"
)

// LDAPConfig holds LDAP connection settings
type LDAPConfig struct {
	Enabled           bool   `json:"enabled"`
	ServerURL         string `json:"server_url"`
	BindDN            string `json:"bind_dn"`
	BindPassword      string `json:"bind_password"`
	SearchBase        string `json:"search_base"`
	SearchFilter      string `json:"search_filter"`
	UsernameAttribute string `json:"username_attribute"`
	EmailAttribute    string `json:"email_attribute"`
	FullnameAttribute string `json:"fullname_attribute"`
	GroupSearchBase   string `json:"group_search_base"`
	AdminGroup        string `json:"admin_group"`
	EditorGroup       string `json:"editor_group"`
	ViewerGroup       string `json:"viewer_group"`
}

// LDAPService handles LDAP authentication
type LDAPService struct {
	userRepo *repositories.UserRepository
	logger   *zap.SugaredLogger
}

// NewLDAPService creates a new LDAP service
func NewLDAPService(userRepo *repositories.UserRepository, logger *zap.SugaredLogger) *LDAPService {
	return &LDAPService{
		userRepo: userRepo,
		logger:   logger,
	}
}

// LDAPAuthResult represents the result of LDAP authentication
type LDAPAuthResult struct {
	Success   bool
	Email     string
	FullName  string
	Username  string
	Role      string
	Groups    []string
	ErrorMsg  string
}

// GetConfig retrieves LDAP configuration from organization settings
func (s *LDAPService) GetConfig(ctx context.Context, orgID uuid.UUID) (*LDAPConfig, error) {
	settings, err := s.userRepo.GetOrganizationSettings(ctx, orgID)
	if err != nil {
		return nil, err
	}

	config := &LDAPConfig{
		Enabled:           false,
		SearchFilter:      "(uid={username})",
		UsernameAttribute: "uid",
		EmailAttribute:    "mail",
		FullnameAttribute: "cn",
		AdminGroup:        "kubeatlas-admins",
		EditorGroup:       "kubeatlas-editors",
		ViewerGroup:       "kubeatlas-viewers",
	}

	ldapSettings, ok := settings["ldap"].(map[string]interface{})
	if !ok {
		return config, nil
	}

	if v, ok := ldapSettings["enabled"].(bool); ok {
		config.Enabled = v
	}
	if v, ok := ldapSettings["server_url"].(string); ok {
		config.ServerURL = v
	}
	if v, ok := ldapSettings["bind_dn"].(string); ok {
		config.BindDN = v
	}
	if v, ok := ldapSettings["bind_password"].(string); ok {
		config.BindPassword = v
	}
	if v, ok := ldapSettings["search_base"].(string); ok {
		config.SearchBase = v
	}
	if v, ok := ldapSettings["search_filter"].(string); ok {
		config.SearchFilter = v
	}
	if v, ok := ldapSettings["username_attribute"].(string); ok {
		config.UsernameAttribute = v
	}
	if v, ok := ldapSettings["email_attribute"].(string); ok {
		config.EmailAttribute = v
	}
	if v, ok := ldapSettings["fullname_attribute"].(string); ok {
		config.FullnameAttribute = v
	}
	if v, ok := ldapSettings["group_search_base"].(string); ok {
		config.GroupSearchBase = v
	}
	if v, ok := ldapSettings["admin_group"].(string); ok {
		config.AdminGroup = v
	}
	if v, ok := ldapSettings["editor_group"].(string); ok {
		config.EditorGroup = v
	}
	if v, ok := ldapSettings["viewer_group"].(string); ok {
		config.ViewerGroup = v
	}

	return config, nil
}

// Authenticate authenticates a user against LDAP
func (s *LDAPService) Authenticate(ctx context.Context, orgID uuid.UUID, username, password string) (*LDAPAuthResult, error) {
	config, err := s.GetConfig(ctx, orgID)
	if err != nil {
		return &LDAPAuthResult{Success: false, ErrorMsg: "Failed to get LDAP config"}, err
	}

	if !config.Enabled {
		return &LDAPAuthResult{Success: false, ErrorMsg: "LDAP is not enabled"}, nil
	}

	if config.ServerURL == "" {
		return &LDAPAuthResult{Success: false, ErrorMsg: "LDAP server URL is not configured"}, nil
	}

	// Connect to LDAP server
	conn, err := s.connect(config.ServerURL)
	if err != nil {
		s.logger.Errorw("Failed to connect to LDAP server", "error", err, "server", config.ServerURL)
		return &LDAPAuthResult{Success: false, ErrorMsg: "Failed to connect to LDAP server"}, err
	}
	defer conn.Close()

	// Bind with service account to search for user
	if config.BindDN != "" && config.BindPassword != "" {
		err = conn.Bind(config.BindDN, config.BindPassword)
		if err != nil {
			s.logger.Errorw("Failed to bind with service account", "error", err, "bindDN", config.BindDN)
			return &LDAPAuthResult{Success: false, ErrorMsg: "Failed to bind with service account"}, err
		}
	}

	// Search for user
	filter := strings.Replace(config.SearchFilter, "{username}", ldap.EscapeFilter(username), -1)
	searchRequest := ldap.NewSearchRequest(
		config.SearchBase,
		ldap.ScopeWholeSubtree,
		ldap.NeverDerefAliases,
		1, // Size limit
		30, // Time limit (seconds)
		false,
		filter,
		[]string{"dn", config.UsernameAttribute, config.EmailAttribute, config.FullnameAttribute, "memberOf"},
		nil,
	)

	sr, err := conn.Search(searchRequest)
	if err != nil {
		s.logger.Errorw("LDAP search failed", "error", err, "filter", filter)
		return &LDAPAuthResult{Success: false, ErrorMsg: "User search failed"}, err
	}

	if len(sr.Entries) == 0 {
		return &LDAPAuthResult{Success: false, ErrorMsg: "User not found"}, nil
	}

	if len(sr.Entries) > 1 {
		return &LDAPAuthResult{Success: false, ErrorMsg: "Multiple users found"}, nil
	}

	userEntry := sr.Entries[0]
	userDN := userEntry.DN

	// Try to bind as the user to verify password
	err = conn.Bind(userDN, password)
	if err != nil {
		s.logger.Warnw("LDAP user authentication failed", "user", username)
		return &LDAPAuthResult{Success: false, ErrorMsg: "Invalid credentials"}, nil
	}

	// Extract user attributes
	email := userEntry.GetAttributeValue(config.EmailAttribute)
	fullName := userEntry.GetAttributeValue(config.FullnameAttribute)
	ldapUsername := userEntry.GetAttributeValue(config.UsernameAttribute)

	// If email is empty, use username@domain pattern
	if email == "" {
		email = username
	}

	// Get user groups
	groups := userEntry.GetAttributeValues("memberOf")

	// Determine role based on group membership
	role := s.determineRole(groups, config)

	s.logger.Infow("LDAP authentication successful", 
		"user", username, 
		"email", email, 
		"role", role,
		"groups", len(groups))

	return &LDAPAuthResult{
		Success:  true,
		Email:    email,
		FullName: fullName,
		Username: ldapUsername,
		Role:     role,
		Groups:   groups,
	}, nil
}

// TestConnection tests LDAP connection with given config
func (s *LDAPService) TestConnection(config *LDAPConfig) error {
	if config.ServerURL == "" {
		return fmt.Errorf("server URL is required")
	}

	conn, err := s.connect(config.ServerURL)
	if err != nil {
		return fmt.Errorf("failed to connect: %w", err)
	}
	defer conn.Close()

	// Test bind
	if config.BindDN != "" && config.BindPassword != "" {
		err = conn.Bind(config.BindDN, config.BindPassword)
		if err != nil {
			return fmt.Errorf("bind failed: %w", err)
		}
	}

	// Test search base
	if config.SearchBase != "" {
		searchRequest := ldap.NewSearchRequest(
			config.SearchBase,
			ldap.ScopeBaseObject,
			ldap.NeverDerefAliases,
			1,
			10,
			false,
			"(objectClass=*)",
			[]string{"dn"},
			nil,
		)

		_, err = conn.Search(searchRequest)
		if err != nil {
			return fmt.Errorf("search base validation failed: %w", err)
		}
	}

	return nil
}

// connect establishes connection to LDAP server
func (s *LDAPService) connect(serverURL string) (*ldap.Conn, error) {
	var conn *ldap.Conn
	var err error

	// Set connection timeout
	ldap.DefaultTimeout = 10 * time.Second

	if strings.HasPrefix(serverURL, "ldaps://") {
		// LDAPS connection (TLS)
		tlsConfig := &tls.Config{
			InsecureSkipVerify: true, // TODO: Make configurable
		}
		conn, err = ldap.DialURL(serverURL, ldap.DialWithTLSConfig(tlsConfig))
	} else if strings.HasPrefix(serverURL, "ldap://") {
		// Plain LDAP connection
		conn, err = ldap.DialURL(serverURL)
	} else {
		return nil, fmt.Errorf("invalid LDAP URL scheme, must be ldap:// or ldaps://")
	}

	if err != nil {
		return nil, err
	}

	return conn, nil
}

// determineRole determines user role based on LDAP group membership
func (s *LDAPService) determineRole(groups []string, config *LDAPConfig) string {
	// Check groups from most privileged to least
	for _, group := range groups {
		groupCN := extractCN(group)
		
		// Check for admin group
		if strings.EqualFold(groupCN, config.AdminGroup) {
			return "admin"
		}
	}

	for _, group := range groups {
		groupCN := extractCN(group)
		
		// Check for editor group
		if strings.EqualFold(groupCN, config.EditorGroup) {
			return "editor"
		}
	}

	for _, group := range groups {
		groupCN := extractCN(group)
		
		// Check for viewer group
		if strings.EqualFold(groupCN, config.ViewerGroup) {
			return "viewer"
		}
	}

	// Default role if no matching group found
	return "viewer"
}

// extractCN extracts CN from a DN string
// e.g., "cn=kubeatlas-admins,ou=groups,dc=example,dc=com" -> "kubeatlas-admins"
func extractCN(dn string) string {
	parts := strings.Split(dn, ",")
	for _, part := range parts {
		if strings.HasPrefix(strings.ToLower(part), "cn=") {
			return strings.TrimPrefix(part, "cn=")
		}
	}
	return dn
}

// SyncLDAPUser creates or updates a local user based on LDAP authentication result
func (s *LDAPService) SyncLDAPUser(ctx context.Context, orgID uuid.UUID, result *LDAPAuthResult) (*models.User, error) {
	// Check if user exists
	user, err := s.userRepo.GetByEmail(ctx, orgID, result.Email)
	if err != nil {
		return nil, err
	}

	if user == nil {
		// Create new user
		user = &models.User{
			OrganizationID: orgID,
			Email:          result.Email,
			Role:           result.Role,
			IsActive:       true,
			Settings:       make(models.JSONMap),
		}

		if result.Username != "" {
			user.Username = models.NewNullStringFromString(result.Username)
		}
		if result.FullName != "" {
			user.FullName = models.NewNullStringFromString(result.FullName)
		}

		// Mark as LDAP user in settings
		user.Settings["auth_source"] = "ldap"
		user.Settings["ldap_groups"] = result.Groups

		// Create without password (LDAP users don't have local passwords)
		err = s.userRepo.Create(ctx, user, "")
		if err != nil {
			return nil, err
		}

		s.logger.Infow("Created LDAP user", "email", result.Email, "role", result.Role)
	} else {
		// Update existing user
		// Update role if changed
		if user.Role != result.Role {
			user.Role = result.Role
		}

		// Update name if provided
		if result.FullName != "" {
			user.FullName = models.NewNullStringFromString(result.FullName)
		}

		// Update LDAP metadata
		if user.Settings == nil {
			user.Settings = make(models.JSONMap)
		}
		user.Settings["auth_source"] = "ldap"
		user.Settings["ldap_groups"] = result.Groups
		user.Settings["last_ldap_sync"] = time.Now().Format(time.RFC3339)

		err = s.userRepo.Update(ctx, user)
		if err != nil {
			return nil, err
		}

		s.logger.Infow("Updated LDAP user", "email", result.Email, "role", result.Role)
	}

	return user, nil
}
