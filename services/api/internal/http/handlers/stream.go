package handlers

import (
	"errors"
	"net/http"
	"time"

	"github.com/talkgideon/api/internal/assistant"
	"github.com/talkgideon/api/internal/store"
	"github.com/talkgideon/api/internal/stream"
)

// StreamEvents opens an SSE stream for a run. If the run is still queued/running
// it executes the engine live; if it already finished it replays the persisted
// answer so reconnecting clients can rebuild the UI.
func (h *Handlers) StreamEvents(w http.ResponseWriter, r *http.Request) {
	run, err := h.Store.GetRun(r.Context(), r.PathValue("runId"))
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "run not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load run")
		return
	}

	emitter, ok := stream.NewSSE(w)
	if !ok {
		writeError(w, http.StatusInternalServerError, "streaming unsupported")
		return
	}

	if run.Status == store.RunCompleted || run.Status == store.RunFailed || run.Status == store.RunCancelled {
		h.replay(r, emitter, run)
		return
	}

	// Live execution. The broker provides a cancellable context tied to this
	// request (client disconnect -> r.Context() done -> run cancelled).
	ctx, release := h.Broker.Begin(r.Context(), run.ID)
	defer release()

	stop := make(chan struct{})
	defer close(stop)
	go keepAlive(emitter, stop)

	if err := h.Engine.Run(ctx, run, emitter); err != nil {
		h.Log.Info("run ended", "run_id", run.ID, "reason", err)
	}
}

// keepAlive pings the client periodically so proxies don't close idle streams.
func keepAlive(em *stream.SSEEmitter, stop <-chan struct{}) {
	t := time.NewTicker(15 * time.Second)
	defer t.Stop()
	for {
		select {
		case <-stop:
			return
		case <-t.C:
			if err := em.Comment("keep-alive"); err != nil {
				return
			}
		}
	}
}

// replay re-emits a finished run's persisted state as events.
func (h *Handlers) replay(r *http.Request, em *stream.SSEEmitter, run *store.AssistantRun) {
	ctx := r.Context()
	_ = em.Emit(event(run.ID, assistant.EvRunStarted, map[string]any{"query": run.Query, "replay": true}))

	if sources, _ := h.Store.ListSources(ctx, run.ID); len(sources) > 0 {
		for i, s := range sources {
			_ = em.Emit(event(run.ID, assistant.EvSearchResult, map[string]any{"source": s, "index": i}))
		}
		_ = em.Emit(event(run.ID, assistant.EvSearchCompleted, map[string]any{"count": len(sources)}))
	}
	if len(run.MemoryUsed) > 0 {
		_ = em.Emit(event(run.ID, assistant.EvMemoryUsed, map[string]any{"items": run.MemoryUsed}))
	}
	if blocks, _ := h.Store.ListBlocks(ctx, run.ID); len(blocks) > 0 {
		for _, b := range blocks {
			_ = em.Emit(event(run.ID, assistant.EvBlockCompleted, map[string]any{"block": assistant.StoreToBlock(b)}))
		}
	}
	_ = em.Emit(event(run.ID, assistant.EvRunCompleted, map[string]any{
		"spokenAnswer":  run.SpokenAnswer,
		"displayAnswer": run.DisplayAnswer,
		"status":        run.Status,
		"latencyMs":     run.LatencyMS,
		"replay":        true,
	}))
}

// event builds an assistant.Event with the standard envelope fields.
func event(runID, typ string, data map[string]any) assistant.Event {
	if data == nil {
		data = map[string]any{}
	}
	data["runId"] = runID
	data["type"] = typ
	data["timestamp"] = time.Now().UTC().Format(time.RFC3339Nano)
	return assistant.Event{Type: typ, Data: data}
}
