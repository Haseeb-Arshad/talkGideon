package assistant

import (
	"context"

	"github.com/talkgideon/api/internal/memory"
	"github.com/talkgideon/api/internal/schema"
	"github.com/talkgideon/api/internal/store"
)

// GenerateRequest is the fully-assembled request handed to a model. The prompt
// builder produces this; the model client consumes it.
type GenerateRequest struct {
	Query        string
	SystemPrompt string
	Context      string // sanitized search + memory context (untrusted evidence)
	Intent       string
	SearchUsed   bool
	Sources      []store.Source
	Memory       []memory.Item
}

// GenerateResponse is the model's structured output.
type GenerateResponse struct {
	SpokenAnswer    string
	DisplayAnswer   string
	Blocks          []schema.Block
	MemoryProposals []memory.Proposal
}

// ModelEvent is one item in a streaming generation.
type ModelEvent struct {
	Kind  string // "delta" | "block" | "done" | "error"
	Delta string
	Block *schema.Block
	Final *GenerateResponse
	Err   error
}

// ModelClient abstracts the generation provider. The app is never locked to a
// single provider; an MVP MockModelClient runs when no key is configured.
type ModelClient interface {
	Generate(ctx context.Context, req GenerateRequest) (GenerateResponse, error)
	Stream(ctx context.Context, req GenerateRequest) (<-chan ModelEvent, error)
}
