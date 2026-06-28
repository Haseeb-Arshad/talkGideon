package tools

import (
	"context"
	"strings"
	"time"

	"github.com/talkgideon/api/internal/id"
	"github.com/talkgideon/api/internal/store"
)

// MockSearcher returns deterministic, plausible sources so the search → stream
// → answer path is exercisable without an Exa API key (development/tests).
type MockSearcher struct{}

func NewMockSearcher() *MockSearcher { return &MockSearcher{} }

func (m *MockSearcher) Search(ctx context.Context, query string, opts SearchOptions) ([]store.Source, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	topic := strings.TrimSpace(query)

	seed := []struct{ title, domain, snippet string }{
		{"Official documentation", "docs.dev", "Authoritative reference relevant to " + topic + "."},
		{"A practical guide", "smashingmagazine.com", "Hands-on patterns, trade-offs, and pitfalls for " + topic + "."},
		{"Benchmarks & field notes", "benchmarks.dev", "Measured comparisons and real-world numbers."},
		{"Community discussion", "news.ycombinator.com", "Experience reports from practitioners."},
		{"Background & definitions", "wikipedia.org", "Overview and key concepts."},
	}

	max := opts.MaxResults
	if max <= 0 || max > len(seed) {
		max = len(seed)
	}
	out := make([]store.Source, 0, max)
	for i := 0; i < max; i++ {
		s := seed[i]
		out = append(out, store.Source{
			ID:        id.New("src"),
			Provider:  "mock",
			Title:     s.title,
			URL:       "https://" + s.domain + "/article",
			Domain:    s.domain,
			Snippet:   s.snippet,
			Score:     1.0 - float64(i)*0.12,
			CreatedAt: now,
		})
	}
	return out, nil
}

var _ Searcher = (*MockSearcher)(nil)
