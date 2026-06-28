package handlers

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/talkgideon/api/internal/assistant"
	"github.com/talkgideon/api/internal/id"
	"github.com/talkgideon/api/internal/store"
)

type createRunReq struct {
	SessionID     string `json:"sessionId"`
	Query         string `json:"query"`
	UserMessageID string `json:"userMessageId"`
}

// CreateRun queues an assistant run. Execution + streaming happens when the
// client connects to GET /api/runs/{runId}/events. If no session is supplied
// one is created; if no user message is supplied one is stored from the query.
func (h *Handlers) CreateRun(w http.ResponseWriter, r *http.Request) {
	var req createRunReq
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body: "+err.Error())
		return
	}
	req.Query = strings.TrimSpace(req.Query)
	if req.Query == "" {
		writeError(w, http.StatusBadRequest, "query is required")
		return
	}
	ctx := r.Context()
	now := time.Now().UTC()

	// Ensure a session exists.
	if req.SessionID == "" {
		s := &store.Session{ID: id.New("sess"), Title: firstLine(req.Query), CreatedAt: now, UpdatedAt: now}
		if err := h.Store.CreateSession(ctx, s); err != nil {
			writeError(w, http.StatusInternalServerError, "could not create session")
			return
		}
		req.SessionID = s.ID
	} else if _, err := h.Store.GetSession(ctx, req.SessionID); errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "session not found")
		return
	}

	// Ensure a user message exists.
	if req.UserMessageID == "" {
		m := &store.Message{ID: id.New("msg"), SessionID: req.SessionID, Role: store.RoleUser, Content: req.Query, CreatedAt: now}
		if err := h.Store.CreateMessage(ctx, m); err != nil {
			writeError(w, http.StatusInternalServerError, "could not store message")
			return
		}
		req.UserMessageID = m.ID
		_ = h.Store.TouchSession(ctx, req.SessionID, firstLine(req.Query))
	}

	run := &store.AssistantRun{
		ID:            id.New("run"),
		SessionID:     req.SessionID,
		UserMessageID: req.UserMessageID,
		Status:        store.RunQueued,
		Query:         req.Query,
		StartedAt:     now,
	}
	if err := h.Store.CreateRun(ctx, run); err != nil {
		writeError(w, http.StatusInternalServerError, "could not create run")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"runId":     run.ID,
		"sessionId": run.SessionID,
		"status":    run.Status,
		"query":     run.Query,
		"eventsUrl": "/api/runs/" + run.ID + "/events",
	})
}

// GetRun returns the run with its assembled answer (blocks + sources).
func (h *Handlers) GetRun(w http.ResponseWriter, r *http.Request) {
	run, err := h.Store.GetRun(r.Context(), r.PathValue("runId"))
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "run not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load run")
		return
	}
	blocks, _ := h.Store.ListBlocks(r.Context(), run.ID)
	sources, _ := h.Store.ListSources(r.Context(), run.ID)

	schemaBlocks := make([]any, 0, len(blocks))
	for _, b := range blocks {
		schemaBlocks = append(schemaBlocks, assistant.StoreToBlock(b))
	}
	answer := assistant.BuildAnswer(run, nil, sources)

	writeJSON(w, http.StatusOK, map[string]any{
		"run":           run,
		"blocks":        schemaBlocks,
		"sources":       answer.Sources,
		"spokenAnswer":  run.SpokenAnswer,
		"displayAnswer": run.DisplayAnswer,
		"memoryUsed":    answer.MemoryUsed,
	})
}

// GetSources returns the normalized sources used by a run.
func (h *Handlers) GetSources(w http.ResponseWriter, r *http.Request) {
	sources, err := h.Store.ListSources(r.Context(), r.PathValue("runId"))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load sources")
		return
	}
	if sources == nil {
		sources = []store.Source{}
	}
	writeJSON(w, http.StatusOK, map[string]any{"sources": sources})
}

// GetMemoryUsed returns which memories shaped a run's answer.
func (h *Handlers) GetMemoryUsed(w http.ResponseWriter, r *http.Request) {
	run, err := h.Store.GetRun(r.Context(), r.PathValue("runId"))
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "run not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load run")
		return
	}
	titles := run.MemoryUsed
	if titles == nil {
		titles = []string{}
	}
	writeJSON(w, http.StatusOK, map[string]any{"memoryUsed": titles})
}
