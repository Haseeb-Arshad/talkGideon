package exa

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/talkgideon/api/internal/store"
	"github.com/talkgideon/api/internal/tools"
)

const defaultBaseURL = "https://api.exa.ai"

// Client talks to Exa. It implements tools.Searcher.
type Client struct {
	apiKey  string
	baseURL string
	http    *http.Client
	timeout time.Duration
}

// New returns an Exa client. timeout bounds each HTTP call.
func New(apiKey string, timeout time.Duration) *Client {
	if timeout <= 0 {
		timeout = 6 * time.Second
	}
	return &Client{
		apiKey:  apiKey,
		baseURL: defaultBaseURL,
		http:    &http.Client{Timeout: timeout},
		timeout: timeout,
	}
}

// Enabled reports whether a key is configured.
func (c *Client) Enabled() bool { return c != nil && c.apiKey != "" }

// Search performs a web search and returns normalized, deduped, ranked sources.
// The current run's id is taken from the context (see tools.WithRunID) so the
// sources can be attributed without changing the Searcher signature.
func (c *Client) Search(ctx context.Context, query string, opts tools.SearchOptions) ([]store.Source, error) {
	if !c.Enabled() {
		return nil, fmt.Errorf("exa: no API key configured")
	}
	if opts.MaxResults <= 0 {
		opts.MaxResults = 6
	}

	body := searchRequest{
		Query:         query,
		NumResults:    opts.MaxResults + 4, // over-fetch; dedup trims back
		Type:          "auto",
		UseAutoprompt: true,
		Contents: &contentsOptions{
			Highlights: &highlightsOptions{NumSentences: 2, HighlightsPerURL: 2},
		},
	}
	if opts.WithContents {
		body.Contents.Text = &textOptions{MaxCharacters: 1200}
	}

	var resp searchResponse
	if err := c.post(ctx, "/search", body, &resp); err != nil {
		return nil, err
	}

	runID, _ := ctx.Value(runIDKey{}).(string)
	return normalize(resp.Results, runID, opts.MaxResults), nil
}

// Contents fetches page text for specific result IDs. Kept for richer evidence;
// not required for MVP search.
func (c *Client) Contents(ctx context.Context, ids []string) (map[string]string, error) {
	if !c.Enabled() {
		return nil, fmt.Errorf("exa: no API key configured")
	}
	var resp searchResponse
	if err := c.post(ctx, "/contents", contentsRequest{IDs: ids, Text: &textOptions{MaxCharacters: 2000}}, &resp); err != nil {
		return nil, err
	}
	out := make(map[string]string, len(resp.Results))
	for _, r := range resp.Results {
		out[r.URL] = r.Text
	}
	return out, nil
}

func (c *Client) post(ctx context.Context, path string, in, out any) error {
	ctx, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()

	payload, err := json.Marshal(in)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+path, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("x-api-key", c.apiKey)

	res, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("exa: request failed: %w", err)
	}
	defer res.Body.Close()

	if res.StatusCode < 200 || res.StatusCode >= 300 {
		b, _ := io.ReadAll(io.LimitReader(res.Body, 2048))
		return fmt.Errorf("exa: status %d: %s", res.StatusCode, string(b))
	}
	return json.NewDecoder(res.Body).Decode(out)
}

// runIDKey carries the current run id through context for source attribution.
type runIDKey struct{}

// WithRunID returns a context that tags sources produced by Search with runID.
func WithRunID(ctx context.Context, runID string) context.Context {
	return context.WithValue(ctx, runIDKey{}, runID)
}

// compile-time assertion that Client satisfies the Searcher capability.
var _ tools.Searcher = (*Client)(nil)
