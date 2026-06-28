package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/talkgideon/api/internal/id"
	"github.com/talkgideon/api/internal/store"
)

type createSessionReq struct {
	Title string `json:"title"`
}

// CreateSession starts a new conversation session.
func (h *Handlers) CreateSession(w http.ResponseWriter, r *http.Request) {
	var req createSessionReq
	if r.ContentLength > 0 {
		if err := decodeJSON(r, &req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid body: "+err.Error())
			return
		}
	}
	now := time.Now().UTC()
	s := &store.Session{ID: id.New("sess"), Title: req.Title, CreatedAt: now, UpdatedAt: now}
	if err := h.Store.CreateSession(r.Context(), s); err != nil {
		writeError(w, http.StatusInternalServerError, "could not create session")
		return
	}
	writeJSON(w, http.StatusCreated, s)
}

// ListSessions returns recent sessions.
func (h *Handlers) ListSessions(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 {
		limit = 50
	}
	sessions, err := h.Store.ListSessions(r.Context(), limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list sessions")
		return
	}
	if sessions == nil {
		sessions = []store.Session{}
	}
	writeJSON(w, http.StatusOK, map[string]any{"sessions": sessions})
}

// GetSession returns a session and its messages.
func (h *Handlers) GetSession(w http.ResponseWriter, r *http.Request) {
	sid := r.PathValue("sessionId")
	s, err := h.Store.GetSession(r.Context(), sid)
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "session not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load session")
		return
	}
	msgs, err := h.Store.ListMessages(r.Context(), sid)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load messages")
		return
	}
	if msgs == nil {
		msgs = []store.Message{}
	}
	writeJSON(w, http.StatusOK, map[string]any{"session": s, "messages": msgs})
}
