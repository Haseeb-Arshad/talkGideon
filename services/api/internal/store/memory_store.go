package store

import (
	"context"
	"sort"
	"sync"
)

// MemStore is an in-memory Store used when DATABASE_URL is unset (development)
// and in tests. It is concurrency-safe.
type MemStore struct {
	mu       sync.RWMutex
	sessions map[string]*Session
	messages map[string]*Message
	runs     map[string]*AssistantRun
	sources  map[string][]Source      // runID -> sources
	blocks   map[string][]AnswerBlock // runID -> blocks
	msgOrder []string                 // message ids in insertion order
}

func NewMemStore() *MemStore {
	return &MemStore{
		sessions: map[string]*Session{},
		messages: map[string]*Message{},
		runs:     map[string]*AssistantRun{},
		sources:  map[string][]Source{},
		blocks:   map[string][]AnswerBlock{},
	}
}

func clone[T any](v *T) *T { c := *v; return &c }

func (s *MemStore) CreateSession(_ context.Context, in *Session) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.sessions[in.ID] = clone(in)
	return nil
}

func (s *MemStore) GetSession(_ context.Context, id string) (*Session, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	v, ok := s.sessions[id]
	if !ok {
		return nil, ErrNotFound
	}
	return clone(v), nil
}

func (s *MemStore) ListSessions(_ context.Context, limit int) ([]Session, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]Session, 0, len(s.sessions))
	for _, v := range s.sessions {
		out = append(out, *v)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].UpdatedAt.After(out[j].UpdatedAt) })
	if limit > 0 && len(out) > limit {
		out = out[:limit]
	}
	return out, nil
}

func (s *MemStore) TouchSession(_ context.Context, id, title string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	v, ok := s.sessions[id]
	if !ok {
		return ErrNotFound
	}
	if title != "" && v.Title == "" {
		v.Title = title
	}
	return nil
}

func (s *MemStore) CreateMessage(_ context.Context, m *Message) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.messages[m.ID] = clone(m)
	s.msgOrder = append(s.msgOrder, m.ID)
	return nil
}

func (s *MemStore) GetMessage(_ context.Context, id string) (*Message, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	v, ok := s.messages[id]
	if !ok {
		return nil, ErrNotFound
	}
	return clone(v), nil
}

func (s *MemStore) ListMessages(_ context.Context, sessionID string) ([]Message, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var out []Message
	for _, mid := range s.msgOrder {
		if m := s.messages[mid]; m != nil && m.SessionID == sessionID {
			out = append(out, *m)
		}
	}
	return out, nil
}

func (s *MemStore) CreateRun(_ context.Context, r *AssistantRun) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.runs[r.ID] = clone(r)
	return nil
}

func (s *MemStore) GetRun(_ context.Context, id string) (*AssistantRun, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	v, ok := s.runs[id]
	if !ok {
		return nil, ErrNotFound
	}
	return clone(v), nil
}

func (s *MemStore) UpdateRun(_ context.Context, r *AssistantRun) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.runs[r.ID]; !ok {
		return ErrNotFound
	}
	s.runs[r.ID] = clone(r)
	return nil
}

func (s *MemStore) AddSource(_ context.Context, src *Source) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.sources[src.RunID] = append(s.sources[src.RunID], *src)
	return nil
}

func (s *MemStore) ListSources(_ context.Context, runID string) ([]Source, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := append([]Source(nil), s.sources[runID]...)
	sort.SliceStable(out, func(i, j int) bool { return out[i].Score > out[j].Score })
	return out, nil
}

func (s *MemStore) AddBlock(_ context.Context, b *AnswerBlock) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.blocks[b.RunID] = append(s.blocks[b.RunID], *b)
	return nil
}

func (s *MemStore) ListBlocks(_ context.Context, runID string) ([]AnswerBlock, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := append([]AnswerBlock(nil), s.blocks[runID]...)
	sort.SliceStable(out, func(i, j int) bool { return out[i].Priority < out[j].Priority })
	return out, nil
}

func (s *MemStore) Ping(_ context.Context) error { return nil }
func (s *MemStore) Close() error                 { return nil }
