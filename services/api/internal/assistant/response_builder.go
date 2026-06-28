package assistant

import (
	"github.com/talkgideon/api/internal/schema"
	"github.com/talkgideon/api/internal/store"
)

// AnswerResponse is the structured contract returned to the frontend for a
// completed run (also assembled from persisted data on GET /runs/{id}).
type AnswerResponse struct {
	RunID         string         `json:"runId"`
	Query         string         `json:"query"`
	Status        string         `json:"status"`
	SpokenAnswer  string         `json:"spokenAnswer"`
	DisplayAnswer string         `json:"displayAnswer"`
	Blocks        []schema.Block `json:"blocks"`
	Sources       []store.Source `json:"sources"`
	MemoryUsed    []string       `json:"memoryUsed"`
	LatencyMS     int64          `json:"latencyMs"`
}

// BlockToStore converts a validated schema.Block into a persistable record.
func BlockToStore(runID string, b schema.Block) *store.AnswerBlock {
	return &store.AnswerBlock{
		ID:          b.ID,
		RunID:       runID,
		Type:        b.Type,
		Title:       b.Title,
		Priority:    b.Priority,
		PayloadJSON: b.Payload,
		CreatedAt:   b.CreatedAt,
	}
}

// StoreToBlock converts a persisted record back into a schema.Block.
func StoreToBlock(r store.AnswerBlock) schema.Block {
	return schema.Block{
		ID:        r.ID,
		Type:      r.Type,
		Title:     r.Title,
		Priority:  r.Priority,
		Payload:   r.PayloadJSON,
		CreatedAt: r.CreatedAt,
	}
}

// BuildAnswer assembles the final response contract.
func BuildAnswer(run *store.AssistantRun, blocks []schema.Block, sources []store.Source) AnswerResponse {
	if blocks == nil {
		blocks = []schema.Block{}
	}
	if sources == nil {
		sources = []store.Source{}
	}
	mem := run.MemoryUsed
	if mem == nil {
		mem = []string{}
	}
	return AnswerResponse{
		RunID:         run.ID,
		Query:         run.Query,
		Status:        run.Status,
		SpokenAnswer:  run.SpokenAnswer,
		DisplayAnswer: run.DisplayAnswer,
		Blocks:        blocks,
		Sources:       sources,
		MemoryUsed:    mem,
		LatencyMS:     run.LatencyMS,
	}
}
