package handlers

import (
	"net/http"
	"time"
)

// Health reports liveness and dependency status (store ping).
func (h *Handlers) Health(w http.ResponseWriter, r *http.Request) {
	storeOK := true
	if err := h.Store.Ping(r.Context()); err != nil {
		storeOK = false
	}
	status := "ok"
	code := http.StatusOK
	if !storeOK {
		status = "degraded"
		code = http.StatusServiceUnavailable
	}
	writeJSON(w, code, map[string]any{
		"status":      status,
		"store":       storeOK,
		"activeRuns":  h.Broker.Active(),
		"environment": h.Cfg.Environment,
		"provider":    h.Cfg.ModelProvider,
		"time":        time.Now().UTC().Format(time.RFC3339),
	})
}
