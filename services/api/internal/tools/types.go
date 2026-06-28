// Package tools holds Gideon's tool routing: the deterministic decision of
// whether a query needs web search, and the interface for executing search.
package tools

import (
	"context"

	"github.com/talkgideon/api/internal/store"
)

// Intent labels (coarse classification used for routing + observability).
const (
	IntentResearch   = "research"
	IntentCompare    = "compare"
	IntentSummarize  = "summarize"
	IntentPlanning   = "planning"
	IntentBrainstorm = "brainstorm"
	IntentRewrite    = "rewrite"
	IntentGeneral    = "general"
)

// SearchDecision is the deterministic router's verdict.
type SearchDecision struct {
	Required bool   `json:"required"`
	Reason   string `json:"reason"`
	Forced   bool   `json:"forced"` // user explicitly forced via "search"/"do not search"
}

// SearchOptions controls a search call.
type SearchOptions struct {
	MaxResults   int
	WithContents bool // also fetch page contents for top results
}

// Searcher executes web search and returns normalized, deduped sources.
// Implemented by tools/exa.Client. Defined here so the run engine depends on
// the capability, not the provider.
type Searcher interface {
	Search(ctx context.Context, query string, opts SearchOptions) ([]store.Source, error)
}
