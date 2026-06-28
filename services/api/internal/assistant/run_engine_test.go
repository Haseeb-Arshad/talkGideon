package assistant

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"sync"
	"testing"
	"time"

	"github.com/talkgideon/api/internal/memory"
	"github.com/talkgideon/api/internal/schema"
	"github.com/talkgideon/api/internal/store"
	"github.com/talkgideon/api/internal/tools"
)

// captureEmitter records every event the engine emits (in order).
type captureEmitter struct {
	mu     sync.Mutex
	events []Event
}

func (c *captureEmitter) Emit(ev Event) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.events = append(c.events, ev)
	return nil
}

func (c *captureEmitter) types() []string {
	out := make([]string, len(c.events))
	for i, e := range c.events {
		out[i] = e.Type
	}
	return out
}

func (c *captureEmitter) has(typ string) bool {
	for _, e := range c.events {
		if e.Type == typ {
			return true
		}
	}
	return false
}

func newTestEngine(t *testing.T) (*Engine, store.Store) {
	t.Helper()
	st := store.NewMemStore()
	obs, err := memory.NewObsidianStore(t.TempDir())
	if err != nil {
		t.Fatalf("vault: %v", err)
	}
	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	e := NewEngine(st, memory.NewService(obs), tools.NewMockSearcher(), NewMockModelClient(), log)
	return e, st
}

func TestRunStreamsProgressively(t *testing.T) {
	e, st := newTestEngine(t)
	ctx := context.Background()

	now := time.Now().UTC()
	if err := st.CreateSession(ctx, &store.Session{ID: "sess_1", CreatedAt: now, UpdatedAt: now}); err != nil {
		t.Fatal(err)
	}
	run := &store.AssistantRun{
		ID: "run_1", SessionID: "sess_1", Status: store.RunQueued,
		Query: "Compare Go and Node for realtime voice agents", StartedAt: now,
	}
	if err := st.CreateRun(ctx, run); err != nil {
		t.Fatal(err)
	}

	cap := &captureEmitter{}
	if err := e.Run(ctx, run, cap); err != nil {
		t.Fatalf("run error: %v", err)
	}

	types := cap.types()
	if len(types) == 0 || types[0] != EvRunStarted {
		t.Fatalf("first event must be run.started, got %v", types)
	}
	if types[len(types)-1] != EvRunCompleted {
		t.Fatalf("last event must be run.completed, got %v", types)
	}
	for _, want := range []string{EvSearchStarted, EvSearchResult, EvSearchCompleted, EvBlockCompleted, EvAnswerDelta} {
		if !cap.has(want) {
			t.Errorf("expected event %q in stream: %v", want, types)
		}
	}

	// Search must come before generation blocks (build progressively).
	idxSearch, idxBlock := -1, -1
	for i, ty := range types {
		if ty == EvSearchCompleted && idxSearch == -1 {
			idxSearch = i
		}
		if ty == EvBlockCompleted && idxBlock == -1 {
			idxBlock = i
		}
	}
	if idxSearch == -1 || idxBlock == -1 || idxSearch > idxBlock {
		t.Errorf("search.completed (%d) should precede first block (%d)", idxSearch, idxBlock)
	}

	// Every emitted block must be schema-valid.
	for _, ev := range cap.events {
		if ev.Type != EvBlockCompleted {
			continue
		}
		b, ok := ev.Data["block"].(schema.Block)
		if !ok {
			t.Fatalf("block event missing typed block payload: %#v", ev.Data)
		}
		if verr := schema.Validate(&b); verr != nil {
			t.Errorf("emitted invalid block %q: %v", b.Type, verr)
		}
	}

	// Persisted state reflects completion.
	got, err := st.GetRun(ctx, "run_1")
	if err != nil {
		t.Fatal(err)
	}
	if got.Status != store.RunCompleted {
		t.Errorf("run status = %q, want completed", got.Status)
	}
	if got.SpokenAnswer == "" || got.DisplayAnswer == "" {
		t.Errorf("answers not persisted: %+v", got)
	}
	if blocks, _ := st.ListBlocks(ctx, "run_1"); len(blocks) == 0 {
		t.Error("no blocks persisted")
	}
	if srcs, _ := st.ListSources(ctx, "run_1"); len(srcs) == 0 {
		t.Error("no sources persisted")
	}
}

func TestRunNoSearchForGenerativeQuery(t *testing.T) {
	e, st := newTestEngine(t)
	ctx := context.Background()
	now := time.Now().UTC()
	_ = st.CreateSession(ctx, &store.Session{ID: "s", CreatedAt: now, UpdatedAt: now})
	run := &store.AssistantRun{ID: "r", SessionID: "s", Status: store.RunQueued, Query: "brainstorm a name for my cat", StartedAt: now}
	_ = st.CreateRun(ctx, run)

	cap := &captureEmitter{}
	if err := e.Run(ctx, run, cap); err != nil {
		t.Fatalf("run error: %v", err)
	}
	if cap.has(EvSearchStarted) {
		t.Errorf("generative query should not trigger search: %v", cap.types())
	}
	if !cap.has(EvRunCompleted) {
		t.Error("run should still complete")
	}
}

// ensure block payloads are JSON-marshalable as emitted (frontend contract).
func TestEmittedBlockMarshals(t *testing.T) {
	e, st := newTestEngine(t)
	ctx := context.Background()
	now := time.Now().UTC()
	_ = st.CreateSession(ctx, &store.Session{ID: "s", CreatedAt: now, UpdatedAt: now})
	run := &store.AssistantRun{ID: "r", SessionID: "s", Status: store.RunQueued, Query: "summarize the news today", StartedAt: now}
	_ = st.CreateRun(ctx, run)

	cap := &captureEmitter{}
	_ = e.Run(ctx, run, cap)
	for _, ev := range cap.events {
		if _, err := json.Marshal(ev.Data); err != nil {
			t.Errorf("event %q not JSON-marshalable: %v", ev.Type, err)
		}
	}
}
