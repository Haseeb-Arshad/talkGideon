package exa

import (
	"net/url"
	"sort"
	"strings"
	"time"

	"github.com/talkgideon/api/internal/id"
	"github.com/talkgideon/api/internal/store"
)

// normalize converts raw Exa results into deduped, ranked store.Source values.
// Dedup is by normalized URL first, then by domain (we keep the best-scoring
// result per domain to avoid flooding the answer with one site).
func normalize(results []exaResult, runID string, max int) []store.Source {
	now := time.Now().UTC()
	seenURL := map[string]bool{}
	bestByDomain := map[string]int{} // domain -> index in out

	var out []store.Source
	for _, r := range results {
		if r.URL == "" {
			continue
		}
		key := canonicalURL(r.URL)
		if seenURL[key] {
			continue
		}
		seenURL[key] = true

		dom := domainOf(r.URL)
		src := store.Source{
			ID:         id.New("src"),
			RunID:      runID,
			Provider:   "exa",
			Title:      strings.TrimSpace(orFallback(r.Title, dom)),
			URL:        r.URL,
			Domain:     dom,
			Snippet:    snippet(r),
			Highlights: cleanStrings(r.Highlights),
			Author:     strings.TrimSpace(r.Author),
			Score:      r.Score,
			CreatedAt:  now,
		}
		if t, ok := parseDate(r.PublishedDate); ok {
			src.PublishedAt = &t
		}

		if idx, ok := bestByDomain[dom]; ok {
			// Keep only the higher-scoring source for this domain.
			if src.Score > out[idx].Score {
				out[idx] = src
			}
			continue
		}
		bestByDomain[dom] = len(out)
		out = append(out, src)
	}

	// Rank by score desc; ranking is intentionally separate from generation.
	sort.SliceStable(out, func(i, j int) bool { return out[i].Score > out[j].Score })
	if max > 0 && len(out) > max {
		out = out[:max]
	}
	return out
}

func snippet(r exaResult) string {
	if len(r.Highlights) > 0 {
		return clip(strings.Join(r.Highlights, " "), 280)
	}
	return clip(strings.TrimSpace(r.Text), 280)
}

func canonicalURL(raw string) string {
	u, err := url.Parse(raw)
	if err != nil {
		return strings.ToLower(strings.TrimRight(raw, "/"))
	}
	host := strings.TrimPrefix(strings.ToLower(u.Host), "www.")
	path := strings.TrimRight(u.Path, "/")
	return host + path
}

func domainOf(raw string) string {
	u, err := url.Parse(raw)
	if err != nil || u.Host == "" {
		return ""
	}
	return strings.TrimPrefix(strings.ToLower(u.Host), "www.")
}

func parseDate(s string) (time.Time, bool) {
	s = strings.TrimSpace(s)
	if s == "" {
		return time.Time{}, false
	}
	for _, layout := range []string{time.RFC3339, "2006-01-02", "2006-01-02T15:04:05Z07:00"} {
		if t, err := time.Parse(layout, s); err == nil {
			return t, true
		}
	}
	return time.Time{}, false
}

func cleanStrings(in []string) []string {
	var out []string
	for _, s := range in {
		if s = strings.TrimSpace(s); s != "" {
			out = append(out, s)
		}
	}
	return out
}

func clip(s string, n int) string {
	s = strings.Join(strings.Fields(s), " ")
	if len(s) <= n {
		return s
	}
	return strings.TrimSpace(s[:n]) + "…"
}

func orFallback(s, fb string) string {
	if strings.TrimSpace(s) == "" {
		return fb
	}
	return s
}
