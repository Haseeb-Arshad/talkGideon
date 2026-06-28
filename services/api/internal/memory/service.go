package memory

import (
	"sort"
	"strings"
	"time"
)

// Service is the memory façade used by handlers and the run engine. It applies
// save rules, retrieves relevant memory for a query, and proxies CRUD to the
// Obsidian store.
type Service struct {
	store *ObsidianStore
}

func NewService(store *ObsidianStore) *Service { return &Service{store: store} }

// Save persists a proposal if it passes the save rules. Returns (nil, nil) when
// the proposal was intentionally skipped.
func (s *Service) Save(p Proposal, userAskedToRemember bool) (*Item, error) {
	if !ShouldSave(p, userAskedToRemember) {
		return nil, nil
	}
	if p.Type == "" {
		p.Type = TypeFact
	}
	if p.Source == "" {
		p.Source = "conversation"
	}
	title := p.Title
	if strings.TrimSpace(title) == "" {
		title = firstWords(p.Content, 8)
	}
	it := Item{
		Title:      title,
		Content:    p.Content,
		Type:       p.Type,
		Source:     p.Source,
		Confidence: p.Confidence,
		Tags:       normalizeTags(p.Tags),
		CreatedAt:  time.Now().UTC(),
	}
	saved, err := s.store.Save(it)
	if err != nil {
		return nil, err
	}
	return &saved, nil
}

// CreateExplicit stores a memory the user (or API) asked for directly.
func (s *Service) CreateExplicit(it Item) (*Item, error) {
	if it.Confidence == 0 {
		it.Confidence = 0.9
	}
	if it.Source == "" {
		it.Source = "user"
	}
	saved, err := s.store.Save(it)
	if err != nil {
		return nil, err
	}
	return &saved, nil
}

// Recent returns the most recently updated memories.
func (s *Service) Recent(limit int) ([]Item, error) {
	items, err := s.store.List()
	if err != nil {
		return nil, err
	}
	items = sortByUpdated(items)
	if limit > 0 && len(items) > limit {
		items = items[:limit]
	}
	return items, nil
}

// Search ranks all memories against the query.
func (s *Service) Search(query string, limit int) ([]Item, error) {
	items, err := s.store.List()
	if err != nil {
		return nil, err
	}
	out := Search(items, query)
	if limit > 0 && len(out) > limit {
		out = out[:limit]
	}
	return out, nil
}

// Retrieve returns memories relevant to a run's query, for prompt context and
// the "memory used" surface. Falls back to recent items when nothing matches.
func (s *Service) Retrieve(query string, limit int) ([]Item, error) {
	hits, err := s.Search(query, limit)
	if err != nil {
		return nil, err
	}
	if len(hits) > 0 {
		return hits, nil
	}
	// A small amount of high-signal recent context is still useful.
	recent, err := s.Recent(limit)
	if err != nil {
		return nil, err
	}
	return recent, nil
}

// Update modifies an existing memory's mutable fields.
func (s *Service) Update(memID string, patch Item) (*Item, error) {
	cur, err := s.store.Get(memID)
	if err != nil {
		return nil, err
	}
	if patch.Title != "" {
		cur.Title = patch.Title
	}
	if patch.Content != "" {
		cur.Content = patch.Content
	}
	if patch.Type != "" && validTypes[patch.Type] {
		cur.Type = patch.Type
	}
	if patch.Tags != nil {
		cur.Tags = normalizeTags(patch.Tags)
	}
	if patch.Confidence > 0 {
		cur.Confidence = patch.Confidence
	}
	// Type may have changed -> file may move; remove the old file first.
	_ = s.store.Delete(memID)
	saved, err := s.store.Save(cur)
	if err != nil {
		return nil, err
	}
	return &saved, nil
}

func (s *Service) Delete(memID string) error { return s.store.Delete(memID) }

func normalizeTags(tags []string) []string {
	seen := map[string]bool{}
	var out []string
	for _, t := range tags {
		t = strings.ToLower(strings.TrimSpace(t))
		if t == "" || seen[t] {
			continue
		}
		seen[t] = true
		out = append(out, t)
	}
	if len(out) == 0 {
		out = []string{"gideon"}
	}
	sort.Strings(out)
	return out
}
