package handlers

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/talkgideon/api/internal/id"
	"github.com/talkgideon/api/internal/store"
)

type createMessageReq struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// CreateMessage appends a message to a session.
func (h *Handlers) CreateMessage(w http.ResponseWriter, r *http.Request) {
	sid := r.PathValue("sessionId")
	if _, err := h.Store.GetSession(r.Context(), sid); errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "session not found")
		return
	}

	var req createMessageReq
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body: "+err.Error())
		return
	}
	if strings.TrimSpace(req.Content) == "" {
		writeError(w, http.StatusBadRequest, "content is required")
		return
	}
	role := req.Role
	if role == "" {
		role = store.RoleUser
	}

	m := &store.Message{
		ID:        id.New("msg"),
		SessionID: sid,
		Role:      role,
		Content:   req.Content,
		CreatedAt: time.Now().UTC(),
	}
	if err := h.Store.CreateMessage(r.Context(), m); err != nil {
		writeError(w, http.StatusInternalServerError, "could not store message")
		return
	}
	_ = h.Store.TouchSession(r.Context(), sid, firstLine(req.Content))
	writeJSON(w, http.StatusCreated, m)
}

func firstLine(s string) string {
	s = strings.TrimSpace(s)
	if i := strings.IndexByte(s, '\n'); i >= 0 {
		s = s[:i]
	}
	if len(s) > 80 {
		s = s[:80]
	}
	return s
}
