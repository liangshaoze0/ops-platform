package config

import (
	"os"
)

type Config struct {
	Environment string
	Database    DatabaseConfig
	GitHub      GitHubConfig
	JWT         JWTConfig
	Server      ServerConfig
	FrontendURL string
}

type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
}

type GitHubConfig struct {
	ClientID     string
	ClientSecret string
	RedirectURL  string
}

type JWTConfig struct {
	Secret     string
	Expiration int // 小时
}

type ServerConfig struct {
	Port string
}

func Load() *Config {
	return &Config{
		Environment: getEnv("ENVIRONMENT", "development"),
		Database: DatabaseConfig{
			Host:     getEnv("DB_HOST", "10.10.24.122"),
			Port:     getEnv("DB_PORT", "3306"),
			User:     getEnv("DB_USER", "opera_man_prod"),
			Password: getEnv("DB_PASSWORD", "info@nengliang2024"),
			DBName:   getEnv("DB_NAME", "k8s_platform"),
		},
		GitHub: GitHubConfig{
			ClientID:     getEnv("GITHUB_CLIENT_ID", ""),
			ClientSecret: getEnv("GITHUB_CLIENT_SECRET", ""),
			RedirectURL:  getEnv("GITHUB_REDIRECT_URL", "http://localhost:8080/api/auth/github/callback"),
		},
		JWT: JWTConfig{
			Secret:     getEnv("JWT_SECRET", "your-secret-key-change-in-production"),
			Expiration: 24, // 24小时
		},
		Server: ServerConfig{
			Port: getEnv("PORT", "8080"),
		},
		FrontendURL: getEnv("FRONTEND_URL", "http://localhost:3000"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
