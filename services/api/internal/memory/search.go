package memory

import (
	"sort"
	"strings"
)

// scored pairs an item with a relevance score for ranking.
type scored struct {
	item  Item
	score int
}

// Search ranks items against a free-text query across title, tags, content, and
// filename. Simple term-overlap scoring for MVP (embeddings can come later).
func Search(items []Item, query string) []Item {
	q := strings.ToLower(strings.TrimSpace(query))
	if q == "" {
		return sortByUpdated(items)
	}
	terms := strings.Fields(q)

	var hits []scored
	for _, it := range items {
		s := scoreItem(it, terms)
		if s > 0 {
			hits = append(hits, scored{it, s})
		}
	}
	sort.SliceStable(hits, func(i, j int) bool {
		if hits[i].score != hits[j].score {
			return hits[i].score > hits[j].score
		}
		return hits[i].item.UpdatedAt.After(hits[j].item.UpdatedAt)
	})
	out := make([]Item, len(hits))
	for i, h := range hits {
		out[i] = h.item
	}
	return out
}

func scoreItem(it Item, terms []string) int {
	title := strings.ToLower(it.Title)
	content := strings.ToLower(it.Content)
	file := strings.ToLower(it.ObsidianPath)
	tags := strings.ToLower(strings.Join(it.Tags, " "))

	score := 0
	for _, t := range terms {
		switch {
		case strings.Contains(title, t):
			score += 5
		case strings.Contains(tags, t):
			score += 4
		case strings.Contains(content, t):
			score += 2
		case strings.Contains(file, t):
			score += 1
		}
	}
	return score
}

func sortByUpdated(items []Item) []Item {
	out := append([]Item(nil), items...)
	sort.SliceStable(out, func(i, j int) bool { return out[i].UpdatedAt.After(out[j].UpdatedAt) })
	return out
}
