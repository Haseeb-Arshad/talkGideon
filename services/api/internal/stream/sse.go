// Package stream implements Server-Sent Events delivery for assistant runs and
// a small broker for tracking/cancelling active runs.
package stream

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"

	"github.com/talkgideon/api/internal/assistant"
)

// SSEEmitter writes assistant events as SSE frames to an HTTP response. It
// implements assistant.Emitter. Writes are serialized so the engine (and any
// keep-alive goroutine) can share it safely.
type SSEEmitter struct {
	w       http.ResponseWriter
	flusher http.Flusher
	mu      sync.Mutex
}

// NewSSE prepares the response for streaming and returns an emitter. It returns
// ok=false if the ResponseWriter cannot flush (SSE not supported).
func NewSSE(w http.ResponseWriter) (*SSEEmitter, bool) {
	f, ok := w.(http.Flusher)
	if !ok {
		return nil, false
	}
	h := w.Header()
	h.Set("Content-Type", "text/event-stream")
	h.Set("Cache-Control", "no-cache")
	h.Set("Connection", "keep-alive")
	h.Set("X-Accel-Buffering", "no") // disable proxy buffering (nginx)
	w.WriteHeader(http.StatusOK)

	e := &SSEEmitter{w: w, flusher: f}
	// Advise the client's reconnect backoff.
	e.raw("retry: 3000\n\n")
	return e, true
}

// Emit writes one event frame and flushes immediately.
func (e *SSEEmitter) Emit(ev assistant.Event) error {
	payload, err := json.Marshal(ev.Data)
	if err != nil {
		return err
	}
	return e.raw(fmt.Sprintf("event: %s\ndata: %s\n\n", ev.Type, payload))
}

// Comment sends an SSE comment line (used for keep-alive pings).
func (e *SSEEmitter) Comment(text string) error {
	return e.raw(": " + text + "\n\n")
}

func (e *SSEEmitter) raw(s string) error {
	e.mu.Lock()
	defer e.mu.Unlock()
	if _, err := fmt.Fprint(e.w, s); err != nil {
		return err
	}
	e.flusher.Flush()
	return nil
}

var _ assistant.Emitter = (*SSEEmitter)(nil)

// FormatFrame renders an event the same way Emit writes it. Exposed for tests.
func FormatFrame(ev assistant.Event) (string, error) {
	payload, err := json.Marshal(ev.Data)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("event: %s\ndata: %s\n\n", ev.Type, payload), nil
}
