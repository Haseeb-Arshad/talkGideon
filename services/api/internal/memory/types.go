// Package memory stores Gideon's long-term memory as Obsidian-compatible
// Markdown files. The frontend never writes the vault directly — the backend
// owns all memory storage, and exposes clean metadata (not file paths).
package memory

import (
	"strings"
	"time"
)

// Memory types.
const (
	TypePreference  = "preference"
	TypeProject     = "project"
	TypeDecision    = "decision"
	TypeInstruction = "instruction"
	TypeFact        = "fact"
)

var validTypes = map[string]bool{
	TypePreference: true, TypeProject: true, TypeDecision: true,
	TypeInstruction: true, TypeFact: true,
}

// Item is one memory. ObsidianPath is internal — it is never serialized to the
// frontend (json:"-").
type Item struct {
	ID           string    `json:"id"`
	Title        string    `json:"title"`
	Content      string    `json:"content"`
	Type         string    `json:"type"`
	Source       string    `json:"source"` // "conversation" | "user" | ...
	Confidence   float64   `json:"confidence"`
	Tags         []string  `json:"tags"`
	ObsidianPath string    `json:"-"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

// Proposal is a candidate memory the engine considers saving after a run.
type Proposal struct {
	Title      string
	Content    string
	Type       string
	Source     string
	Confidence float64
	Tags       []string
}

// ShouldSave encodes the save rules: keep stable, useful, durable memories;
// reject one-off noise and obvious secrets. Explicit user intent ("remember…")
// always passes.
func ShouldSave(p Proposal, userAskedToRemember bool) bool {
	content := strings.TrimSpace(p.Content)
	if content == "" || len(content) < 8 {
		return false
	}
	if looksLikeSecret(content) {
		return false // never persist secrets / credentials, even if asked
	}
	if userAskedToRemember {
		return true
	}
	if !validTypes[p.Type] {
		return false
	}
	// Durable categories are worth keeping; raw facts need higher confidence.
	switch p.Type {
	case TypePreference, TypeProject, TypeDecision, TypeInstruction:
		return p.Confidence >= 0.6
	case TypeFact:
		return p.Confidence >= 0.8
	}
	return false
}

func looksLikeSecret(s string) bool {
	low := strings.ToLower(s)
	markers := []string{"api key", "api_key", "secret", "password", "passwd",
		"private key", "-----begin", "bearer ", "token=", "sk-", "ssh-rsa"}
	for _, m := range markers {
		if strings.Contains(low, m) {
			return true
		}
	}
	return false
}

// folderForType maps a memory type to its Obsidian subfolder.
func folderForType(t string) string {
	switch t {
	case TypePreference:
		return "Preferences"
	case TypeProject:
		return "Projects"
	case TypeDecision:
		return "Decisions"
	case TypeInstruction:
		return "Instructions"
	case TypeFact:
		return "Facts"
	default:
		return "Facts"
	}
}
