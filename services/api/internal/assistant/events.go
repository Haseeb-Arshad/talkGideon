// Package assistant is Gideon's intelligence layer: planning, tool routing,
// model generation, validation, and the run engine that streams it all.
package assistant

import "time"

// SSE event names. The frontend builds the answer progressively from these.
const (
	EvRunStarted      = "run.started"
	EvRunStatus       = "run.status"
	EvThinking        = "assistant.thinking"
	EvSearchStarted   = "search.started"
	EvSearchResult    = "search.result"
	EvSearchCompleted = "search.completed"
	EvAnswerDelta     = "answer.delta"
	EvBlockStarted    = "ui.block.started"
	EvBlockCompleted  = "ui.block.completed"
	EvSourcesUpdated  = "sources.updated"
	EvMemoryUsed      = "memory.used"
	EvMemorySaved     = "memory.saved"
	EvRunCompleted    = "run.completed"
	EvRunError        = "run.error"
)

// Event is a single server-sent event. Data is JSON-encoded by the emitter.
type Event struct {
	Type string
	Data map[string]any
}

// Emitter delivers events to a consumer (SSE in production, a capture buffer in
// tests). Implementations must be safe for the engine's single goroutine.
type Emitter interface {
	Emit(ev Event) error
}

// newEvent builds an event, stamping runId + timestamp consistently.
func newEvent(runID, typ string, data map[string]any) Event {
	if data == nil {
		data = map[string]any{}
	}
	data["runId"] = runID
	data["type"] = typ
	if _, ok := data["timestamp"]; !ok {
		data["timestamp"] = time.Now().UTC().Format(time.RFC3339Nano)
	}
	return Event{Type: typ, Data: data}
}
