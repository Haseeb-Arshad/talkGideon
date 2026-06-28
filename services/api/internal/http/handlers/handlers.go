// Package handlers implements Gideon's HTTP API: sessions, messages, runs, SSE
// streaming, and memory.
package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/talkgideon/api/internal/assistant"
	"github.com/talkgideon/api/internal/config"
	"github.com/talkgideon/api/internal/memory"
	"github.com/talkgideon/api/internal/store"
	"github.com/talkgideon/api/internal/stream"
)

// Handlers carries the dependencies shared by all HTTP handlers.
type Handlers struct {
	Store  store.Store
	Memory *memory.Service
	Engine *assistant.Engine
	Broker *stream.Broker
	Log    *slog.Logger
	Cfg    config.Config
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]any{"error": msg})
}

func decodeJSON(r *http.Request, v any) error {
	dec := json.NewDecoder(http.MaxBytesReader(nil, r.Body, 1<<20)) // 1MB cap
	dec.DisallowUnknownFields()
	return dec.Decode(v)
}
