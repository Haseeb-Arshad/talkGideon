package assistant

import (
	"regexp"
	"strings"

	"github.com/talkgideon/api/internal/store"
)

// Web content is untrusted. It is evidence, never instruction. These helpers
// neutralize prompt-injection attempts inside retrieved pages so source text
// cannot override system/developer instructions.

// injectionPatterns match common attempts to hijack the assistant.
var injectionPatterns = []*regexp.Regexp{
	regexp.MustCompile(`(?i)ignore (all|any|the)?\s*(previous|prior|above)\s*(instructions|prompts?|messages?)`),
	regexp.MustCompile(`(?i)disregard (all|any|the)?\s*(previous|prior|above)`),
	regexp.MustCompile(`(?i)forget (all|everything|your)\s*(instructions|rules|context)?`),
	regexp.MustCompile(`(?i)you are now\b`),
	regexp.MustCompile(`(?i)new (system|developer) (prompt|instructions?)`),
	regexp.MustCompile(`(?i)system\s*:\s*`),
	regexp.MustCompile(`(?i)\bact as\b.*\b(developer|system|admin)\b`),
	regexp.MustCompile(`(?i)reveal (your|the) (system|hidden) (prompt|instructions?)`),
	regexp.MustCompile(`(?i)print (your|the) (system|hidden) (prompt|instructions?)`),
	regexp.MustCompile(`(?i)override (your|the|all) (instructions|rules|safety)`),
}

// SanitizeSourceText strips/flags instruction-like content from a single piece
// of retrieved text. The returned string is safe to embed as evidence.
func SanitizeSourceText(text string) string {
	if text == "" {
		return ""
	}
	out := text
	for _, re := range injectionPatterns {
		out = re.ReplaceAllString(out, "[filtered: instruction-like content removed]")
	}
	// Collapse role-label spoofing at line starts (e.g. "assistant:", "system:").
	lines := strings.Split(out, "\n")
	for i, ln := range lines {
		trimmed := strings.TrimSpace(strings.ToLower(ln))
		for _, role := range []string{"system:", "developer:", "assistant:", "user:"} {
			if strings.HasPrefix(trimmed, role) {
				lines[i] = "[filtered role label] " + strings.TrimSpace(ln[len(role):])
			}
		}
	}
	return strings.Join(lines, "\n")
}

// SanitizeSources returns copies of the sources with snippet/highlights
// sanitized. Original metadata (title, url, domain, score) is preserved.
func SanitizeSources(sources []store.Source) []store.Source {
	out := make([]store.Source, len(sources))
	for i, s := range sources {
		s.Snippet = SanitizeSourceText(s.Snippet)
		hl := make([]string, len(s.Highlights))
		for j, h := range s.Highlights {
			hl[j] = SanitizeSourceText(h)
		}
		s.Highlights = hl
		out[i] = s
	}
	return out
}
