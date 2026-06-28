package memory

import (
	"strings"
	"testing"
	"time"
)

func TestRenderParseRoundTrip(t *testing.T) {
	in := Item{
		ID:         "memory_123",
		Title:      "Warm minimal UI: not neon",
		Content:    "User prefers warm minimal personal-intelligence UI over blue neon cyberpunk dashboard UI.",
		Type:       TypePreference,
		Source:     "conversation",
		Confidence: 0.86,
		Tags:       []string{"gideon", "ui", "preference"},
		CreatedAt:  time.Date(2026, 6, 27, 0, 0, 0, 0, time.UTC),
		UpdatedAt:  time.Date(2026, 6, 27, 0, 0, 0, 0, time.UTC),
	}

	md := Render(in)
	if !strings.HasPrefix(md, "---\n") {
		t.Fatalf("rendered markdown missing frontmatter:\n%s", md)
	}
	if !strings.Contains(md, "type: preference") || !strings.Contains(md, "confidence: 0.86") {
		t.Errorf("frontmatter fields missing:\n%s", md)
	}

	out, err := Parse(md)
	if err != nil {
		t.Fatalf("Parse error: %v", err)
	}
	if out.ID != in.ID || out.Type != in.Type || out.Source != in.Source {
		t.Errorf("scalar mismatch: %+v", out)
	}
	if out.Title != in.Title {
		t.Errorf("title mismatch: got %q want %q", out.Title, in.Title)
	}
	if out.Confidence != in.Confidence {
		t.Errorf("confidence mismatch: got %v want %v", out.Confidence, in.Confidence)
	}
	if len(out.Tags) != 3 || out.Tags[0] != "gideon" {
		t.Errorf("tags mismatch: %v", out.Tags)
	}
	if strings.TrimSpace(out.Content) != in.Content {
		t.Errorf("content mismatch:\n got %q\nwant %q", out.Content, in.Content)
	}
	if !out.CreatedAt.Equal(in.CreatedAt) {
		t.Errorf("createdAt mismatch: %v", out.CreatedAt)
	}
}

func TestShouldSaveRules(t *testing.T) {
	// Secrets are never saved, even when explicitly asked.
	if ShouldSave(Proposal{Content: "my api key is sk-abc123", Type: TypeFact, Confidence: 1}, true) {
		t.Error("secrets must never be saved")
	}
	// Explicit user intent saves durable content.
	if !ShouldSave(Proposal{Content: "Remember I use Obsidian for notes", Type: TypeFact, Confidence: 0.1}, true) {
		t.Error("explicit remember should save")
	}
	// Low-confidence non-explicit fact is skipped.
	if ShouldSave(Proposal{Content: "It might rain tomorrow", Type: TypeFact, Confidence: 0.5}, false) {
		t.Error("low-confidence one-off fact should be skipped")
	}
	// Durable preference at decent confidence is saved.
	if !ShouldSave(Proposal{Content: "Prefers Go for low-latency services", Type: TypePreference, Confidence: 0.7}, false) {
		t.Error("durable preference should save")
	}
	// Empty/tiny content rejected.
	if ShouldSave(Proposal{Content: "ok", Type: TypeFact, Confidence: 1}, true) {
		t.Error("tiny content should be rejected")
	}
}
