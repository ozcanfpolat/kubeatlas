package config

import (
	"errors"
	"os"
	"strconv"
	"strings"
)

var (
	ErrMissingJWTSecret     = errors.New("JWT_SECRET environment variable is required and must be at least 32 characters")
	ErrMissingEncryptionKey = errors.New("ENCRYPTION_KEY environment variable is required for production mode")
	ErrMissingDBPassword    = errors.New("DB_PASSWORD environment variable is required for production mode")
)

// Config holds all configuration for the application
type Config struct {
	Server      ServerConfig
	Database    DatabaseConfig
	JWT         JWTConfig
	Storage     StorageConfig
	LDAP        LDAPConfig
	Redis       RedisConfig
	Encryption  EncryptionConfig
	Sync        SyncConfig
	Log         LogConfig
}

// ServerConfig holds HTTP server configuration
type ServerConfig struct {
	Port        int
	Mode        string // "debug" or "release"
	CORSOrigins []string
}

// DatabaseConfig holds database configuration
type DatabaseConfig struct {
	Host     string
	Port     int
	User     string
	Password string
	Database string
	SSLMode  string
	MaxConns int
}

// JWTConfig holds JWT configuration
type JWTConfig struct {
	Secret          string
	ExpirationHours int
	RefreshHours    int
}

// StorageConfig holds file storage configuration
type StorageConfig struct {
	Type      string // "local", "s3", "minio"
	LocalPath string
	S3Bucket  string
	S3Region  string
	S3Endpoint string
}

// LDAPConfig holds LDAP/AD configuration
type LDAPConfig struct {
	Enabled      bool
	URL          string
	BindDN       string
	BindPassword string
	BaseDN       string
	UserFilter   string
	GroupFilter  string
}

// RedisConfig holds Redis configuration
type RedisConfig struct {
	Host     string
	Port     int
	Password string
	Enabled  bool
}

// EncryptionConfig holds encryption settings
type EncryptionConfig struct {
	Key string
}

// SyncConfig holds sync settings
type SyncConfig struct {
	IntervalMinutes int
	TimeoutSeconds  int
}

// LogConfig holds logging configuration
type LogConfig struct {
	Level  string
	Format string
}

// Load loads configuration from environment variables
// Supports both .env.example format and docker-compose format for backward compatibility
func Load() (*Config, error) {
	cfg := &Config{
		Server: ServerConfig{
			Port:        getEnvInt("SERVER_PORT", 8080),
			Mode:        getEnvDefault([]string{"SERVER_MODE", "GIN_MODE"}, "debug"),
			CORSOrigins: getEnvSlice("CORS_ORIGINS", []string{"http://localhost:3000"}),
		},
		Database: DatabaseConfig{
			Host:     getEnvDefault([]string{"DB_HOST", "DATABASE_HOST"}, "localhost"),
			Port:     getEnvIntDefault([]string{"DB_PORT", "DATABASE_PORT"}, 5432),
			User:     getEnvDefault([]string{"DB_USER", "DATABASE_USER"}, "kubeatlas"),
			Password: getEnvDefault([]string{"DB_PASSWORD", "DATABASE_PASSWORD"}, ""),
			Database: getEnvDefault([]string{"DB_NAME", "DATABASE_NAME"}, "kubeatlas"),
			SSLMode:  getEnvDefault([]string{"DB_SSLMODE", "DATABASE_SSL_MODE"}, "disable"),
			MaxConns: getEnvIntDefault([]string{"DB_MAX_CONNS", "DATABASE_MAX_CONNECTIONS"}, 25),
		},
		JWT: JWTConfig{
			Secret:          getEnv("JWT_SECRET", ""),
			ExpirationHours: getEnvIntDefault([]string{"JWT_EXPIRATION_HOURS", "JWT_ACCESS_TOKEN_HOURS"}, 24),
			RefreshHours:    getEnvIntDefault([]string{"JWT_REFRESH_HOURS", "JWT_REFRESH_TOKEN_HOURS"}, 168),
		},
		Storage: StorageConfig{
			Type:       getEnv("STORAGE_TYPE", "local"),
			LocalPath:  getEnv("STORAGE_LOCAL_PATH", "./data/uploads"),
			S3Bucket:   getEnv("STORAGE_S3_BUCKET", ""),
			S3Region:   getEnv("STORAGE_S3_REGION", ""),
			S3Endpoint: getEnv("STORAGE_S3_ENDPOINT", ""),
		},
		LDAP: LDAPConfig{
			Enabled:      getEnvBool("LDAP_ENABLED", false),
			URL:          getEnv("LDAP_URL", ""),
			BindDN:       getEnv("LDAP_BIND_DN", ""),
			BindPassword: getEnv("LDAP_BIND_PASSWORD", ""),
			BaseDN:       getEnv("LDAP_BASE_DN", ""),
			UserFilter:   getEnv("LDAP_USER_FILTER", "(uid=%s)"),
			GroupFilter:  getEnv("LDAP_GROUP_FILTER", "(member=%s)"),
		},
		Redis: RedisConfig{
			Host:     getEnv("REDIS_HOST", ""),
			Port:     getEnvInt("REDIS_PORT", 6379),
			Password: getEnv("REDIS_PASSWORD", ""),
			Enabled:  getEnv("REDIS_HOST", "") != "",
		},
		Encryption: EncryptionConfig{
			Key: getEnv("ENCRYPTION_KEY", ""),
		},
		Sync: SyncConfig{
			IntervalMinutes: getEnvInt("SYNC_INTERVAL_MINUTES", 30),
			TimeoutSeconds:  getEnvInt("SYNC_TIMEOUT_SECONDS", 300),
		},
		Log: LogConfig{
			Level:  getEnv("LOG_LEVEL", "info"),
			Format: getEnv("LOG_FORMAT", "json"),
		},
	}

	// Security validations for production mode
	if cfg.Server.Mode == "release" {
		// JWT Secret is required and must be at least 32 characters
		if len(cfg.JWT.Secret) < 32 {
			return nil, ErrMissingJWTSecret
		}
		// Encryption key is required for production
		if cfg.Encryption.Key == "" {
			return nil, ErrMissingEncryptionKey
		}
		// Database password is required for production
		if cfg.Database.Password == "" {
			return nil, ErrMissingDBPassword
		}
	} else {
		// Development mode: use default secret if not provided (with warning)
		if cfg.JWT.Secret == "" {
			cfg.JWT.Secret = "dev-secret-key-do-not-use-in-production-32chars"
		}
		if cfg.Encryption.Key == "" {
			cfg.Encryption.Key = "dev-encryption-key-do-not-use-in-prod"
		}
	}

	return cfg, nil
}

// Helper functions for environment variables
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// getEnvDefault checks multiple env var names and returns the first set value
func getEnvDefault(keys []string, defaultValue string) string {
	for _, key := range keys {
		if value := os.Getenv(key); value != "" {
			return value
		}
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
	}
	return defaultValue
}

// getEnvIntDefault checks multiple env var names and returns the first valid int value
func getEnvIntDefault(keys []string, defaultValue int) int {
	for _, key := range keys {
		if value := os.Getenv(key); value != "" {
			if intVal, err := strconv.Atoi(value); err == nil {
				return intVal
			}
		}
	}
	return defaultValue
}

func getEnvBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if boolVal, err := strconv.ParseBool(value); err == nil {
			return boolVal
		}
	}
	return defaultValue
}

func getEnvSlice(key string, defaultValue []string) []string {
	if value := os.Getenv(key); value != "" {
		return strings.Split(value, ",")
	}
	return defaultValue
}
