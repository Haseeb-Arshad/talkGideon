// Package http wires Gideon's routes and middleware onto a stdlib ServeMux
// (Go 1.22+ method+pattern routing — no external router needed).
package http

import (
	"log/slog"
	"net/http"

	"github.com/talkgideon/api/internal/http/handlers"
)

// NewRouter builds the fully-wired HTTP handler.
func NewRouter(h *handlers.Handlers, log *slog.Logger, allowedOrigins []string) http.Handler {
	mux := http.NewServeMux()

	// Health
	mux.HandleFunc("GET /health", h.Health)

	// Sessions
	mux.HandleFunc("POST /api/sessions", h.CreateSession)
	mux.HandleFunc("GET /api/sessions", h.ListSessions)
	mux.HandleFunc("GET /api/sessions/{sessionId}", h.GetSession)
	mux.HandleFunc("POST /api/sessions/{sessionId}/messages", h.CreateMessage)

	// Runs
	mux.HandleFunc("POST /api/runs", h.CreateRun)
	mux.HandleFunc("GET /api/runs/{runId}", h.GetRun)
	mux.HandleFunc("GET /api/runs/{runId}/events", h.StreamEvents)
	mux.HandleFunc("GET /api/runs/{runId}/sources", h.GetSources)
	mux.HandleFunc("GET /api/runs/{runId}/memory-used", h.GetMemoryUsed)

	// Memory
	mux.HandleFunc("GET /api/memory/recent", h.MemoryRecent)
	mux.HandleFunc("GET /api/memory/search", h.MemorySearch)
	mux.HandleFunc("POST /api/memory", h.MemoryCreate)
	mux.HandleFunc("PATCH /api/memory/{memoryId}", h.MemoryUpdate)
	mux.HandleFunc("DELETE /api/memory/{memoryId}", h.MemoryDelete)

	return Chain(mux,
		Recoverer(log),
		RequestID,
		CORS(allowedOrigins),
		Logger(log),
	)
}
