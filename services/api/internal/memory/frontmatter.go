package memory

import (
	"fmt"
	"strconv"
	"strings"
	"time"
)

// frontmatter is the minimal YAML-style header Obsidian understands. We hand-
// roll encode/decode for the small, fixed set of fields we use (no YAML dep).

func encodeFrontmatter(it Item) string {
	var b strings.Builder
	b.WriteString("---\n")
	fmt.Fprintf(&b, "id: %s\n", it.ID)
	fmt.Fprintf(&b, "title: %s\n", yamlString(it.Title))
	fmt.Fprintf(&b, "type: %s\n", it.Type)
	fmt.Fprintf(&b, "source: %s\n", it.Source)
	fmt.Fprintf(&b, "confidence: %s\n", strconv.FormatFloat(it.Confidence, 'f', -1, 64))
	fmt.Fprintf(&b, "created_at: %s\n", it.CreatedAt.UTC().Format(time.RFC3339))
	fmt.Fprintf(&b, "updated_at: %s\n", it.UpdatedAt.UTC().Format(time.RFC3339))
	b.WriteString("tags:\n")
	if len(it.Tags) == 0 {
		b.WriteString("  - gideon\n")
	}
	for _, t := range it.Tags {
		fmt.Fprintf(&b, "  - %s\n", t)
	}
	b.WriteString("---\n")
	return b.String()
}

// parseFrontmatter parses the header block and returns the body (content) after
// the closing "---".
func parseFrontmatter(raw string) (Item, string, error) {
	raw = strings.ReplaceAll(raw, "\r\n", "\n")
	if !strings.HasPrefix(raw, "---\n") {
		return Item{}, "", fmt.Errorf("missing frontmatter")
	}
	rest := raw[len("---\n"):]
	end := strings.Index(rest, "\n---")
	if end < 0 {
		return Item{}, "", fmt.Errorf("unterminated frontmatter")
	}
	header := rest[:end]
	body := rest[end+len("\n---"):]
	body = strings.TrimPrefix(body, "\n")
	body = strings.TrimLeft(body, "\n")

	var it Item
	var inTags bool
	for _, line := range strings.Split(header, "\n") {
		if strings.HasPrefix(line, "  - ") {
			if inTags {
				it.Tags = append(it.Tags, strings.TrimSpace(line[4:]))
			}
			continue
		}
		key, val, ok := strings.Cut(line, ":")
		if !ok {
			continue
		}
		key = strings.TrimSpace(key)
		val = strings.TrimSpace(val)
		inTags = false
		switch key {
		case "id":
			it.ID = val
		case "title":
			it.Title = unquote(val)
		case "type":
			it.Type = val
		case "source":
			it.Source = val
		case "confidence":
			it.Confidence, _ = strconv.ParseFloat(val, 64)
		case "created_at":
			it.CreatedAt, _ = time.Parse(time.RFC3339, val)
		case "updated_at":
			it.UpdatedAt, _ = time.Parse(time.RFC3339, val)
		case "tags":
			inTags = true
		}
	}
	return it, strings.TrimSpace(body), nil
}

// yamlString quotes a value when it contains characters that would confuse the
// minimal parser.
func yamlString(s string) string {
	if s == "" {
		return `""`
	}
	if strings.ContainsAny(s, ":#\"'\n") {
		return `"` + strings.ReplaceAll(s, `"`, `'`) + `"`
	}
	return s
}

func unquote(s string) string {
	if len(s) >= 2 && s[0] == '"' && s[len(s)-1] == '"' {
		return s[1 : len(s)-1]
	}
	return s
}
