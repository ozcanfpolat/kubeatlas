package config

import (
	"os"
	"strconv"
	"strings"
)

// Config holds all configuration for the application
type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	JWT      JWTConfig
	Storage  StorageConfig
	LDAP     LDAPConfig
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

// Load loads configuration from environment variables
func Load() (*Config, error) {
	cfg := &Config{
		Server: ServerConfig{
			Port:        getEnvInt("SERVER_PORT", 8080),
			Mode:        getEnv("SERVER_MODE", "debug"),
			CORSOrigins: getEnvSlice("CORS_ORIGINS", []string{"http://localhost:3000"}),
		},
		Database: DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnvInt("DB_PORT", 5432),
			User:     getEnv("DB_USER", "kubeatlas"),
			Password: getEnv("DB_PASSWORD", "kubeatlas"),
			Database: getEnv("DB_NAME", "kubeatlas"),
			SSLMode:  getEnv("DB_SSLMODE", "disable"),
			MaxConns: getEnvInt("DB_MAX_CONNS", 25),
		},
		JWT: JWTConfig{
			Secret:          getEnv("JWT_SECRET", "change-me-in-production"),
			ExpirationHours: getEnvInt("JWT_EXPIRATION_HOURS", 24),
			RefreshHours:    getEnvInt("JWT_REFRESH_HOURS", 168), // 7 days
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

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
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
