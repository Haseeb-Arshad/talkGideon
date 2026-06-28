package memory

import "strings"

// Render produces the full Markdown document (frontmatter + body) for an item.
func Render(it Item) string {
	var b strings.Builder
	b.WriteString(encodeFrontmatter(it))
	b.WriteString("\n")
	b.WriteString(strings.TrimSpace(it.Content))
	b.WriteString("\n")
	return b.String()
}

// Parse reads a Markdown document back into an Item (with Content set to body).
func Parse(raw string) (Item, error) {
	it, body, err := parseFrontmatter(raw)
	if err != nil {
		return Item{}, err
	}
	it.Content = body
	return it, nil
}
