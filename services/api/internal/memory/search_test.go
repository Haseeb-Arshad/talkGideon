package memory

import (
	"testing"
	"time"
)

func TestSearchRanksTitleOverContent(t *testing.T) {
	items := []Item{
		{Title: "Voice pipeline decisions", Content: "Go gateway and Node brain", Tags: []string{"voice"}, UpdatedAt: time.Now()},
		{Title: "Random note", Content: "a passing mention of voice somewhere", Tags: []string{"misc"}, UpdatedAt: time.Now()},
		{Title: "UI preferences", Content: "warm minimal", Tags: []string{"ui"}, UpdatedAt: time.Now()},
	}

	got := Search(items, "voice")
	if len(got) != 2 {
		t.Fatalf("expected 2 matches for 'voice', got %d", len(got))
	}
	// Title match outranks content match.
	if got[0].Title != "Voice pipeline decisions" {
		t.Errorf("expected title match first, got %q", got[0].Title)
	}
}

func TestSearchByTag(t *testing.T) {
	items := []Item{
		{Title: "Note A", Content: "nothing here", Tags: []string{"obsidian", "gideon"}, UpdatedAt: time.Now()},
		{Title: "Note B", Content: "nothing", Tags: []string{"other"}, UpdatedAt: time.Now()},
	}
	got := Search(items, "obsidian")
	if len(got) != 1 || got[0].Title != "Note A" {
		t.Fatalf("tag search failed: %+v", got)
	}
}

func TestSearchEmptyReturnsByRecency(t *testing.T) {
	older := time.Now().Add(-time.Hour)
	newer := time.Now()
	items := []Item{
		{Title: "Old", UpdatedAt: older},
		{Title: "New", UpdatedAt: newer},
	}
	got := Search(items, "")
	if len(got) != 2 || got[0].Title != "New" {
		t.Fatalf("empty query should sort by recency: %+v", got)
	}
}
