// Package config loads runtime configuration from the environment.
// A local .env file (if present, next to the working dir) is loaded first as a
// convenience for development — real deployments set real env vars.
package config

import (
	"bufio"
	"os"
	"strings"
	"time"
)

type Config struct {
	Port           string
	DatabaseURL    string // empty -> in-memory store (dev fallback)
	RedisURL       string
	ExaAPIKey      string
	ModelProvider  string // "mock" | "openai" | "anthropic" | ...
	ModelAPIKey    string
	ObsidianVault  string
	AllowedOrigins []string
	Environment    string // "development" | "production"
	ExaTimeout     time.Duration
	ModelTimeout   time.Duration
	RunTimeout     time.Duration
}

// Load reads configuration from environment variables, applying sane defaults.
func Load() Config {
	loadDotEnv(".env")

	c := Config{
		Port:           getenv("PORT", "8787"),
		DatabaseURL:    os.Getenv("DATABASE_URL"),
		RedisURL:       os.Getenv("REDIS_URL"),
		ExaAPIKey:      os.Getenv("EXA_API_KEY"),
		ModelProvider:  getenv("MODEL_PROVIDER", "mock"),
		ModelAPIKey:    os.Getenv("MODEL_API_KEY"),
		ObsidianVault:  getenv("OBSIDIAN_VAULT_PATH", "./vault"),
		AllowedOrigins: splitCSV(getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173")),
		Environment:    getenv("ENVIRONMENT", "development"),
		ExaTimeout:     6 * time.Second,
		ModelTimeout:   30 * time.Second,
		RunTimeout:     60 * time.Second,
	}
	// Without an API key the only sensible provider is the mock.
	if c.ModelProvider != "mock" && c.ModelAPIKey == "" {
		c.ModelProvider = "mock"
	}
	return c
}

func (c Config) IsProduction() bool { return c.Environment == "production" }

func getenv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func splitCSV(s string) []string {
	var out []string
	for _, p := range strings.Split(s, ",") {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, p)
		}
	}
	return out
}

// loadDotEnv is a tiny KEY=VALUE parser — no external dependency. Existing env
// vars always win over file values.
func loadDotEnv(path string) {
	f, err := os.Open(path)
	if err != nil {
		return
	}
	defer f.Close()

	sc := bufio.NewScanner(f)
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		k, v, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		k = strings.TrimSpace(k)
		v = strings.Trim(strings.TrimSpace(v), `"'`)
		if _, exists := os.LookupEnv(k); !exists {
			_ = os.Setenv(k, v)
		}
	}
}
