package exa

import "testing"

func TestNormalizeDedupAndRank(t *testing.T) {
	results := []exaResult{
		{Title: "Low", URL: "https://go.dev/a", Score: 0.4, Text: "alpha"},
		{Title: "High same domain", URL: "https://go.dev/b", Score: 0.9, Text: "beta"},
		{Title: "Other", URL: "https://nodejs.org/x", Score: 0.7, Highlights: []string{"hi"}},
		{Title: "Dup url", URL: "https://nodejs.org/x", Score: 0.95}, // exact dup -> dropped
		{Title: "No url", URL: "", Score: 1.0},                       // skipped
	}
	out := normalize(results, "run_1", 10)

	if len(out) != 2 {
		t.Fatalf("expected 2 deduped sources, got %d: %+v", len(out), out)
	}
	// Ranked by score desc: go.dev (0.9) before nodejs.org (0.7).
	if out[0].Domain != "go.dev" || out[1].Domain != "nodejs.org" {
		t.Errorf("unexpected ranking/domains: %q, %q", out[0].Domain, out[1].Domain)
	}
	// Best-per-domain kept the higher score for go.dev.
	if out[0].Score != 0.9 {
		t.Errorf("expected go.dev best score 0.9, got %v", out[0].Score)
	}
	for _, s := range out {
		if s.RunID != "run_1" {
			t.Errorf("source RunID not set: %+v", s)
		}
		if s.Provider != "exa" {
			t.Errorf("provider should be exa, got %q", s.Provider)
		}
	}
	// Highlights become the snippet when present.
	if out[1].Snippet != "hi" {
		t.Errorf("expected highlight snippet, got %q", out[1].Snippet)
	}
}

func TestNormalizeMaxCap(t *testing.T) {
	results := []exaResult{
		{Title: "1", URL: "https://a.com", Score: 0.9},
		{Title: "2", URL: "https://b.com", Score: 0.8},
		{Title: "3", URL: "https://c.com", Score: 0.7},
	}
	out := normalize(results, "r", 2)
	if len(out) != 2 {
		t.Fatalf("expected max cap of 2, got %d", len(out))
	}
}

func TestCanonicalURLAndDomain(t *testing.T) {
	if got := canonicalURL("https://WWW.Go.dev/Docs/"); got != "go.dev/Docs" {
		t.Errorf("canonicalURL = %q", got)
	}
	if got := domainOf("https://www.nodejs.org/api"); got != "nodejs.org" {
		t.Errorf("domainOf = %q", got)
	}
}
