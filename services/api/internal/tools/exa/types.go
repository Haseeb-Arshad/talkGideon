// Package exa is a thin client for the Exa search API. Raw Exa responses never
// leave this package — callers receive normalized store.Source values.
package exa

// searchRequest is the body for POST /search.
type searchRequest struct {
	Query         string           `json:"query"`
	NumResults    int              `json:"numResults"`
	Type          string           `json:"type,omitempty"` // "auto" | "neural" | "keyword"
	UseAutoprompt bool             `json:"useAutoprompt,omitempty"`
	Contents      *contentsOptions `json:"contents,omitempty"`
}

type contentsOptions struct {
	Text       *textOptions       `json:"text,omitempty"`
	Highlights *highlightsOptions `json:"highlights,omitempty"`
}

type textOptions struct {
	MaxCharacters int  `json:"maxCharacters,omitempty"`
	IncludeHTML   bool `json:"includeHtmlTags"`
}

type highlightsOptions struct {
	NumSentences     int `json:"numSentences,omitempty"`
	HighlightsPerURL int `json:"highlightsPerUrl,omitempty"`
}

// searchResponse mirrors the subset of Exa's response we consume.
type searchResponse struct {
	Results []exaResult `json:"results"`
}

type exaResult struct {
	ID            string   `json:"id"`
	Title         string   `json:"title"`
	URL           string   `json:"url"`
	PublishedDate string   `json:"publishedDate"`
	Author        string   `json:"author"`
	Score         float64  `json:"score"`
	Text          string   `json:"text"`
	Highlights    []string `json:"highlights"`
}

// contentsRequest is the body for POST /contents.
type contentsRequest struct {
	IDs  []string     `json:"ids"`
	Text *textOptions `json:"text,omitempty"`
}
