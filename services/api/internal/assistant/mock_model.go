package assistant

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	"github.com/talkgideon/api/internal/id"
	"github.com/talkgideon/api/internal/memory"
	"github.com/talkgideon/api/internal/schema"
	"github.com/talkgideon/api/internal/tools"
)

// MockModelClient is a deterministic, offline "model" used when no provider key
// is configured. It produces valid, structured UI blocks so the whole gateway
// (planning → search → generation → validation → streaming) is exercisable in
// development without external services.
type MockModelClient struct{}

func NewMockModelClient() *MockModelClient { return &MockModelClient{} }

func block(typ, title string, priority int, payload any) schema.Block {
	raw, _ := json.Marshal(payload)
	return schema.Block{
		ID:        id.New("block"),
		Type:      typ,
		Title:     title,
		Priority:  priority,
		Payload:   raw,
		CreatedAt: time.Now().UTC(),
	}
}

// Generate builds the full structured answer in one shot.
func (m *MockModelClient) Generate(_ context.Context, req GenerateRequest) (GenerateResponse, error) {
	return m.build(req), nil
}

// Stream emits the same answer progressively: a few answer deltas, then each
// block, then a final done event carrying the assembled response.
func (m *MockModelClient) Stream(ctx context.Context, req GenerateRequest) (<-chan ModelEvent, error) {
	out := make(chan ModelEvent)
	resp := m.build(req)

	go func() {
		defer close(out)
		// Stream the spoken answer as word-ish chunks.
		for _, chunk := range chunkText(resp.DisplayAnswer, 8) {
			select {
			case <-ctx.Done():
				out <- ModelEvent{Kind: "error", Err: ctx.Err()}
				return
			case out <- ModelEvent{Kind: "delta", Delta: chunk}:
			}
			sleep(ctx, 35*time.Millisecond)
		}
		for i := range resp.Blocks {
			b := resp.Blocks[i]
			select {
			case <-ctx.Done():
				out <- ModelEvent{Kind: "error", Err: ctx.Err()}
				return
			case out <- ModelEvent{Kind: "block", Block: &b}:
			}
			sleep(ctx, 60*time.Millisecond)
		}
		final := resp
		out <- ModelEvent{Kind: "done", Final: &final}
	}()
	return out, nil
}

func (m *MockModelClient) build(req GenerateRequest) GenerateResponse {
	if req.Intent == tools.IntentCompare || isComparison(req.Query) {
		return m.compareAnswer(req)
	}
	return m.generalAnswer(req)
}

func (m *MockModelClient) compareAnswer(req GenerateRequest) GenerateResponse {
	spoken := "For realtime voice agents, use Go for the low-latency gateway and Node or TypeScript for the frontend and orchestration."
	display := "Go is the stronger choice for the low-latency, highly concurrent gateway that streams audio and brokers events. Node (TypeScript) wins on iteration speed, frontend integration, and an ecosystem rich in AI and media tooling. The pragmatic answer is to combine them."

	blocks := []schema.Block{
		block(schema.TypeSummaryCard, "Summary", 1, map[string]any{
			"text": display,
			"tags": []string{"Low-latency gateway → Go", "Orchestration → Node", "Hybrid recommended"},
		}),
		block(schema.TypeComparisonTable, "Comparison", 2, map[string]any{
			"columns": []string{"Dimension", "Go", "Node"},
			"rows": []map[string]any{
				{"dimension": "Performance", "a": "Compiled, predictable tail latencies", "b": "JIT, occasional GC pauses", "winner": "a"},
				{"dimension": "Concurrency", "a": "Goroutines + channels", "b": "Event loop; needs workers", "winner": "a"},
				{"dimension": "Memory footprint", "a": "Lean (~10–30MB)", "b": "Heavier (V8 baseline)", "winner": "a"},
				{"dimension": "Developer experience", "a": "Simple, strict", "b": "Fluid, huge tooling", "winner": "b"},
				{"dimension": "Ecosystem", "a": "Focused", "b": "Vast (AI, media, web)", "winner": "b"},
				{"dimension": "Realtime networking", "a": "First-class (WebRTC/WS/gRPC)", "b": "Capable (ws mature)", "winner": "a"},
				{"dimension": "Deployment fit", "a": "Single binary", "b": "Runtime + node_modules", "winner": "a"},
			},
		}),
		block(schema.TypeRecommendationCard, "Recommendation", 3, map[string]any{
			"recommendation": "Use Go for the realtime gateway and latency-sensitive services; use TypeScript/Node for the frontend, orchestration, and integrations.",
			"points": []string{
				"Go: audio transport, session fan-out, the WebRTC/WebSocket edge.",
				"Node: agent orchestration, tool-calling, business logic, the web client.",
			},
		}),
		block(schema.TypeArchitecture, "Voice-agent flow", 4, map[string]any{
			"nodes": []map[string]any{
				{"title": "Client", "sub": "WebRTC mic"},
				{"title": "Go gateway", "sub": "stream + VAD"},
				{"title": "Node brain", "sub": "LLM + tools"},
				{"title": "TTS", "sub": "stream back"},
			},
		}),
	}

	blocks = append(blocks, m.sourceAndFollowups(req, []string{
		"Show latency benchmarks", "Design the voice-agent architecture",
		"Compare WebRTC vs WebSockets", "Generate backend stack", "Show deployment options",
	})...)

	return GenerateResponse{
		SpokenAnswer:    spoken,
		DisplayAnswer:   display,
		Blocks:          blocks,
		MemoryProposals: m.proposals(req),
	}
}

func (m *MockModelClient) generalAnswer(req GenerateRequest) GenerateResponse {
	q := strings.TrimSpace(req.Query)
	display := "Here's a clear, structured take on \"" + q + "\". Gideon distilled the essentials and surfaced where to dig deeper."
	spoken := "Here's a concise answer to " + q + "."

	blocks := []schema.Block{
		block(schema.TypeSummaryCard, "Summary", 1, map[string]any{
			"text": display,
			"tags": []string{"Summarized", "Actionable"},
		}),
	}
	blocks = append(blocks, m.sourceAndFollowups(req, []string{
		"Go deeper on the trade-offs", "Show me sources", "Summarize in 3 bullets", "Plan an architecture",
	})...)

	return GenerateResponse{
		SpokenAnswer:    spoken,
		DisplayAnswer:   display,
		Blocks:          blocks,
		MemoryProposals: m.proposals(req),
	}
}

// sourceAndFollowups appends a source_grid (only when sources exist), a
// memory_used block (only when memory was used), and follow-up chips.
func (m *MockModelClient) sourceAndFollowups(req GenerateRequest, chips []string) []schema.Block {
	var out []schema.Block
	if len(req.Sources) > 0 {
		srcs := make([]map[string]any, 0, len(req.Sources))
		for _, s := range req.Sources {
			srcs = append(srcs, map[string]any{
				"title": s.Title, "url": s.URL, "domain": s.Domain, "snippet": s.Snippet,
			})
		}
		out = append(out, block(schema.TypeSourceGrid, "Sources", 5, map[string]any{"sources": srcs}))
	}
	if len(req.Memory) > 0 {
		items := make([]string, 0, len(req.Memory))
		for _, mi := range req.Memory {
			items = append(items, mi.Title)
		}
		out = append(out, block(schema.TypeMemoryUsed, "Memory used", 6, map[string]any{"items": items}))
	}
	out = append(out, block(schema.TypeFollowUpChips, "Continue", 7, map[string]any{"chips": chips}))
	return out
}

func (m *MockModelClient) proposals(req GenerateRequest) []memory.Proposal {
	// Conservative: only propose project/preference memory for substantive
	// queries; the save rules apply the final filter.
	if len(req.Query) < 16 {
		return nil
	}
	return []memory.Proposal{{
		Title:      "Interest: " + clipWords(req.Query, 8),
		Content:    "User asked Gideon about: " + req.Query,
		Type:       memory.TypeProject,
		Source:     "conversation",
		Confidence: 0.55, // below threshold by default -> usually skipped
		Tags:       []string{"gideon", req.Intent},
	}}
}

func isComparison(q string) bool {
	q = strings.ToLower(q)
	return strings.Contains(q, " vs ") || strings.Contains(q, "compare")
}

func chunkText(s string, wordsPer int) []string {
	words := strings.Fields(s)
	var out []string
	for i := 0; i < len(words); i += wordsPer {
		end := i + wordsPer
		if end > len(words) {
			end = len(words)
		}
		out = append(out, strings.Join(words[i:end], " ")+" ")
	}
	return out
}

func clipWords(s string, n int) string {
	f := strings.Fields(s)
	if len(f) > n {
		f = f[:n]
	}
	return strings.Join(f, " ")
}

func sleep(ctx context.Context, d time.Duration) {
	t := time.NewTimer(d)
	defer t.Stop()
	select {
	case <-ctx.Done():
	case <-t.C:
	}
}

var _ ModelClient = (*MockModelClient)(nil)
