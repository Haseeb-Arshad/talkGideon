package handlers

import (
	"errors"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/talkgideon/api/internal/memory"
)

// MemoryRecent returns the most recently updated memories.
func (h *Handlers) MemoryRecent(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 {
		limit = 20
	}
	items, err := h.Memory.Recent(limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not read memory")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"memories": nonNil(items)})
}

// MemorySearch ranks memories against ?q=.
func (h *Handlers) MemorySearch(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 {
		limit = 20
	}
	items, err := h.Memory.Search(q, limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not search memory")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"query": q, "memories": nonNil(items)})
}

type memoryReq struct {
	Title      string   `json:"title"`
	Content    string   `json:"content"`
	Type       string   `json:"type"`
	Tags       []string `json:"tags"`
	Confidence float64  `json:"confidence"`
}

// MemoryCreate stores a memory explicitly (user/API initiated).
func (h *Handlers) MemoryCreate(w http.ResponseWriter, r *http.Request) {
	var req memoryReq
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body: "+err.Error())
		return
	}
	if strings.TrimSpace(req.Content) == "" {
		writeError(w, http.StatusBadRequest, "content is required")
		return
	}
	it := memory.Item{
		Title:      req.Title,
		Content:    req.Content,
		Type:       req.Type,
		Tags:       req.Tags,
		Confidence: req.Confidence,
	}
	if it.Type == "" {
		it.Type = memory.TypeFact
	}
	saved, err := h.Memory.CreateExplicit(it)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not save memory")
		return
	}
	writeJSON(w, http.StatusCreated, saved)
}

// MemoryUpdate patches an existing memory.
func (h *Handlers) MemoryUpdate(w http.ResponseWriter, r *http.Request) {
	var req memoryReq
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body: "+err.Error())
		return
	}
	patch := memory.Item{
		Title:      req.Title,
		Content:    req.Content,
		Type:       req.Type,
		Tags:       req.Tags,
		Confidence: req.Confidence,
	}
	updated, err := h.Memory.Update(r.PathValue("memoryId"), patch)
	if errors.Is(err, os.ErrNotExist) {
		writeError(w, http.StatusNotFound, "memory not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not update memory")
		return
	}
	writeJSON(w, http.StatusOK, updated)
}

// MemoryDelete removes a memory.
func (h *Handlers) MemoryDelete(w http.ResponseWriter, r *http.Request) {
	err := h.Memory.Delete(r.PathValue("memoryId"))
	if errors.Is(err, os.ErrNotExist) {
		writeError(w, http.StatusNotFound, "memory not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not delete memory")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func nonNil(items []memory.Item) []memory.Item {
	if items == nil {
		return []memory.Item{}
	}
	return items
}
