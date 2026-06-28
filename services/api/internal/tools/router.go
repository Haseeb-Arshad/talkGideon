package tools

import "strings"

// searchSignals imply the user wants fresh / external / cited information.
var searchSignals = []string{
	"latest", "current", "today", "news", "price", "ranking", "release",
	"version", "docs", "benchmark", "provider", "market", "citation",
	"source", "sources", "research", "web", "find", "look up", "lookup",
	"compare tools", "who is", "what is the latest", "recent", "trending",
	"stock", "weather", "release notes", "changelog",
}

// noSearchSignals imply purely generative / local work where search adds noise.
var noSearchSignals = []string{
	"brainstorm", "rewrite", "reword", "rephrase", "draft", "write me",
	"plan my", "personal plan", "from the context", "based on our",
	"imagine", "pretend", "roleplay",
}

// DecideSearch is the deterministic tool router. Explicit user overrides win;
// otherwise it weighs signal words. When ambiguous, it does NOT search (cheaper
// and safer — the model can ask to search via a follow-up).
func DecideSearch(query string) SearchDecision {
	q := strings.ToLower(query)

	// Explicit overrides.
	if strings.Contains(q, "do not search") || strings.Contains(q, "don't search") || strings.Contains(q, "no search") {
		return SearchDecision{Required: false, Reason: "user explicitly disabled search", Forced: true}
	}
	if hasWord(q, "search") || strings.Contains(q, "search the web") || strings.Contains(q, "look it up") {
		return SearchDecision{Required: true, Reason: "user explicitly requested search", Forced: true}
	}

	// Strong "do not search" leanings.
	for _, s := range noSearchSignals {
		if strings.Contains(q, s) {
			// A comparison of named tools still benefits from sources even when
			// phrased as brainstorming, so don't hard-block "compare".
			if !strings.Contains(q, "compare") {
				return SearchDecision{Reason: "generative/local task: " + s}
			}
		}
	}

	// Search leanings.
	for _, s := range searchSignals {
		if strings.Contains(q, s) {
			return SearchDecision{Required: true, Reason: "query implies external info: " + s}
		}
	}

	// "compare X and Y" / "X vs Y" benefit from sources.
	if strings.Contains(q, " vs ") || strings.Contains(q, "compare ") {
		return SearchDecision{Required: true, Reason: "comparison benefits from sources"}
	}

	return SearchDecision{Required: false, Reason: "no external-info signals detected"}
}

// ClassifyIntent gives a coarse intent label for routing + telemetry.
func ClassifyIntent(query string) string {
	q := strings.ToLower(query)
	switch {
	case strings.Contains(q, " vs ") || strings.Contains(q, "compare"):
		return IntentCompare
	case strings.Contains(q, "summar") || strings.Contains(q, "tl;dr") || strings.Contains(q, "tldr"):
		return IntentSummarize
	case strings.Contains(q, "rewrite") || strings.Contains(q, "rephrase") || strings.Contains(q, "reword"):
		return IntentRewrite
	case strings.Contains(q, "brainstorm") || strings.Contains(q, "ideas for"):
		return IntentBrainstorm
	case strings.Contains(q, "plan") || strings.Contains(q, "architecture") || strings.Contains(q, "design a"):
		return IntentPlanning
	case strings.Contains(q, "research") || strings.Contains(q, "find") || strings.Contains(q, "latest") || strings.Contains(q, "news"):
		return IntentResearch
	default:
		return IntentGeneral
	}
}

// hasWord reports whether word appears as a whole token in q.
func hasWord(q, word string) bool {
	for _, f := range strings.FieldsFunc(q, func(r rune) bool {
		return !(r >= 'a' && r <= 'z') && !(r >= '0' && r <= '9')
	}) {
		if f == word {
			return true
		}
	}
	return false
}
