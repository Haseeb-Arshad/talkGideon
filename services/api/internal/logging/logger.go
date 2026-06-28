// Package logging provides a structured slog logger configured per environment.
package logging

import (
	"log/slog"
	"os"
)

// New returns a JSON logger in production and a readable text logger in dev.
func New(environment string) *slog.Logger {
	level := slog.LevelDebug
	if environment == "production" {
		level = slog.LevelInfo
	}
	opts := &slog.HandlerOptions{Level: level}

	var h slog.Handler
	if environment == "production" {
		h = slog.NewJSONHandler(os.Stdout, opts)
	} else {
		h = slog.NewTextHandler(os.Stdout, opts)
	}
	return slog.New(h)
}
