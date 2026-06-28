package assistant

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"strings"
	"time"

	"github.com/talkgideon/api/internal/id"
	"github.com/talkgideon/api/internal/memory"
	"github.com/talkgideon/api/internal/schema"
	"github.com/talkgideon/api/internal/store"
	"github.com/talkgideon/api/internal/telemetry"
	"github.com/talkgideon/api/internal/tools"
)

// Engine runs an assistant turn end-to-end, streaming events as it goes.
type Engine struct {
	store    store.Store
	memory   *memory.Service
	searcher tools.Searcher
	model    ModelClient
	log      *slog.Logger
}

func NewEngine(st store.Store, mem *memory.Service, searcher tools.Searcher, model ModelClient, log *slog.Logger) *Engine {
	return &Engine{store: st, memory: mem, searcher: searcher, model: model, log: log}
}

// emit sends an event; a non-nil error (client gone) aborts the run.
func (e *Engine) emit(em Emitter, runID, typ string, data map[string]any) error {
	return em.Emit(newEvent(runID, typ, data))
}

// Run executes the full pipeline. It persists run state transitions and the
// final answer. The provided ctx bounds the whole run and enables cancellation.
func (e *Engine) Run(ctx context.Context, run *store.AssistantRun, em Emitter) error {
	obs := telemetry.Start(run.ID, run.SessionID, "runs.events")
	defer obs.Finish(e.log)

	// 1. First event immediately — the frontend can react before any work.
	if err := e.emit(em, run.ID, EvRunStarted, map[string]any{"query": run.Query}); err != nil {
		return err
	}
	e.setStatus(ctx, run, store.RunRunning, em)

	// 2. Plan: intent + deterministic search decision.
	plan := PlanQuery(run.Query)
	obs.Intent = plan.Intent
	obs.SearchRequired = plan.SearchRequired
	_ = e.emit(em, run.ID, EvThinking, map[string]any{
		"message": "Thinking it through…", "intent": plan.Intent,
	})

	// 3. Search (only when needed and a searcher is available).
	var sources []store.Source
	if plan.SearchRequired && e.searcher != nil {
		var err error
		sources, err = e.runSearch(ctx, run, em, obs)
		if err != nil && errors.Is(err, context.Canceled) {
			return e.cancel(ctx, run, em, obs)
		}
		// A search failure is non-fatal: continue answering without sources.
	}

	// 4. Retrieve relevant memory (honest: only actual matches are "used").
	var mems []memory.Item
	if e.memory != nil {
		mems, _ = e.memory.Search(run.Query, 4)
		obs.MemoryCount = len(mems)
		if len(mems) > 0 {
			titles := make([]string, len(mems))
			for i, m := range mems {
				titles[i] = m.Title
			}
			run.MemoryUsed = titles
			_ = e.emit(em, run.ID, EvMemoryUsed, map[string]any{"items": titles})
		}
	}

	// 5. Generate (streamed) with validation per block.
	e.setStatus(ctx, run, store.RunGenerating, em)
	req := BuildRequest(run.Query, plan.Intent, len(sources) > 0, sources, mems)

	final, kept, err := e.generate(ctx, run, em, req)
	if err != nil {
		if errors.Is(err, context.Canceled) {
			return e.cancel(ctx, run, em, obs)
		}
		return e.fail(ctx, run, em, obs, err)
	}

	// 6. Persist the answer + completion.
	now := time.Now().UTC()
	run.Status = store.RunCompleted
	run.SpokenAnswer = final.SpokenAnswer
	run.DisplayAnswer = final.DisplayAnswer
	run.CompletedAt = &now
	run.LatencyMS = obs.Elapsed().Milliseconds()
	obs.LatencyMS = run.LatencyMS
	if err := e.store.UpdateRun(ctx, run); err != nil {
		e.log.Warn("persist run failed", "err", err)
	}

	// 7. Consider saving memory from this turn.
	e.maybeSaveMemory(run, final, em)

	// 8. Done.
	return e.emit(em, run.ID, EvRunCompleted, map[string]any{
		"spokenAnswer":  final.SpokenAnswer,
		"displayAnswer": final.DisplayAnswer,
		"blockCount":    len(kept),
		"sourceCount":   len(sources),
		"latencyMs":     run.LatencyMS,
		"status":        run.Status,
	})
}

func (e *Engine) runSearch(ctx context.Context, run *store.AssistantRun, em Emitter, obs *telemetry.RunObservation) ([]store.Source, error) {
	e.setStatus(ctx, run, store.RunSearching, em)
	if err := e.emit(em, run.ID, EvSearchStarted, map[string]any{"message": "Searching trusted sources…"}); err != nil {
		return nil, err
	}

	srcs, err := e.searcher.Search(ctx, run.Query, tools.SearchOptions{MaxResults: 5})
	if err != nil {
		_ = e.emit(em, run.ID, EvSearchCompleted, map[string]any{"count": 0, "error": "search unavailable"})
		e.log.Warn("search failed", "run_id", run.ID, "err", err)
		return nil, err
	}

	obs.ToolsUsed = append(obs.ToolsUsed, "search")
	obs.SourceCount = len(srcs)
	for i := range srcs {
		srcs[i].RunID = run.ID
		if err := e.store.AddSource(ctx, &srcs[i]); err != nil {
			e.log.Warn("persist source failed", "err", err)
		}
		if err := e.emit(em, run.ID, EvSearchResult, map[string]any{
			"source": publicSource(srcs[i]), "index": i,
		}); err != nil {
			return srcs, err
		}
	}

	_ = e.emit(em, run.ID, EvSourcesUpdated, map[string]any{"count": len(srcs)})
	return srcs, e.emit(em, run.ID, EvSearchCompleted, map[string]any{"count": len(srcs)})
}

// generate streams model output, validating each block before emitting it, and
// returns the final response plus the kept (renderable) blocks.
func (e *Engine) generate(ctx context.Context, run *store.AssistantRun, em Emitter, req GenerateRequest) (*GenerateResponse, []schema.Block, error) {
	stream, err := e.model.Stream(ctx, req)
	if err != nil {
		return nil, nil, err
	}

	var final *GenerateResponse
	var kept []schema.Block

	for ev := range stream {
		switch ev.Kind {
		case "delta":
			if err := e.emit(em, run.ID, EvAnswerDelta, map[string]any{"delta": ev.Delta}); err != nil {
				return nil, nil, err
			}
		case "block":
			if ev.Block == nil {
				continue
			}
			b := *ev.Block
			ok, reason := schema.ValidateAndRepair(&b)
			if !ok {
				e.log.Warn("dropped invalid block", "run_id", run.ID, "type", b.Type, "reason", reason)
				continue
			}
			_ = e.emit(em, run.ID, EvBlockStarted, map[string]any{"blockId": b.ID, "blockType": b.Type})
			if err := e.store.AddBlock(ctx, BlockToStore(run.ID, b)); err != nil {
				e.log.Warn("persist block failed", "err", err)
			}
			kept = append(kept, b)
			if err := e.emit(em, run.ID, EvBlockCompleted, map[string]any{"block": b}); err != nil {
				return nil, nil, err
			}
		case "done":
			final = ev.Final
		case "error":
			return nil, nil, ev.Err
		}
	}

	if err := ctx.Err(); err != nil {
		return nil, nil, err
	}
	if final == nil {
		// Stream ended without a final; synthesize one.
		final = &GenerateResponse{DisplayAnswer: "", SpokenAnswer: ""}
	}

	// Fallback: never leave the UI empty — synthesize a summary from text.
	if len(kept) == 0 && strings.TrimSpace(final.DisplayAnswer) != "" {
		raw, _ := json.Marshal(map[string]any{"text": final.DisplayAnswer})
		b := schema.Block{
			ID: id.New("block"), Type: schema.TypeSummaryCard, Title: "Summary",
			Priority: 1, Payload: raw, CreatedAt: time.Now().UTC(),
		}
		if ok, _ := schema.ValidateAndRepair(&b); ok {
			_ = e.store.AddBlock(ctx, BlockToStore(run.ID, b))
			_ = e.emit(em, run.ID, EvBlockCompleted, map[string]any{"block": b})
			kept = append(kept, b)
		}
	}
	return final, kept, nil
}

func (e *Engine) maybeSaveMemory(run *store.AssistantRun, final *GenerateResponse, em Emitter) {
	if e.memory == nil {
		return
	}
	userAsked := strings.Contains(strings.ToLower(run.Query), "remember")
	for _, p := range final.MemoryProposals {
		saved, err := e.memory.Save(p, userAsked)
		if err != nil {
			e.log.Warn("memory save failed", "err", err)
			continue
		}
		if saved != nil {
			_ = e.emit(em, run.ID, EvMemorySaved, map[string]any{
				"id": saved.ID, "title": saved.Title, "type": saved.Type,
			})
		}
	}
}

// --- state helpers ----------------------------------------------------------

func (e *Engine) setStatus(ctx context.Context, run *store.AssistantRun, status string, em Emitter) {
	run.Status = status
	if err := e.store.UpdateRun(ctx, run); err != nil {
		e.log.Warn("update status failed", "err", err)
	}
	_ = e.emit(em, run.ID, EvRunStatus, map[string]any{"status": status})
}

func (e *Engine) fail(ctx context.Context, run *store.AssistantRun, em Emitter, obs *telemetry.RunObservation, cause error) error {
	now := time.Now().UTC()
	run.Status = store.RunFailed
	run.Error = cause.Error()
	run.CompletedAt = &now
	run.LatencyMS = obs.Elapsed().Milliseconds()
	obs.LatencyMS = run.LatencyMS
	obs.ErrorType = "generation_error"
	_ = e.store.UpdateRun(ctx, run)
	_ = e.emit(em, run.ID, EvRunError, map[string]any{"error": cause.Error()})
	return cause
}

func (e *Engine) cancel(ctx context.Context, run *store.AssistantRun, em Emitter, obs *telemetry.RunObservation) error {
	now := time.Now().UTC()
	run.Status = store.RunCancelled
	run.CompletedAt = &now
	run.LatencyMS = obs.Elapsed().Milliseconds()
	obs.LatencyMS = run.LatencyMS
	obs.ErrorType = "cancelled"
	// Use a fresh context: the run ctx is already cancelled.
	_ = e.store.UpdateRun(context.Background(), run)
	_ = e.emit(em, run.ID, EvRunError, map[string]any{"error": "cancelled", "cancelled": true})
	return context.Canceled
}

// publicSource is the source shape sent over the wire (already normalized).
func publicSource(s store.Source) map[string]any {
	return map[string]any{
		"id": s.ID, "provider": s.Provider, "title": s.Title, "url": s.URL,
		"domain": s.Domain, "snippet": s.Snippet, "score": s.Score,
		"publishedAt": s.PublishedAt,
	}
}
