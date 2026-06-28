package tools

import "testing"

func TestDecideSearch(t *testing.T) {
	cases := []struct {
		query string
		want  bool
	}{
		{"What is the latest version of Go?", true},
		{"find me benchmarks for postgres", true},
		{"compare Go and Node for realtime voice agents", true},
		{"WebRTC vs WebSockets", true},
		{"price of bitcoin today", true},
		{"brainstorm names for my app", false},
		{"rewrite this paragraph to be friendlier", false},
		{"plan my week around deep work", false},
		{"explain how a hash map works", false},
	}
	for _, c := range cases {
		got := DecideSearch(c.query).Required
		if got != c.want {
			t.Errorf("DecideSearch(%q).Required = %v, want %v", c.query, got, c.want)
		}
	}
}

func TestDecideSearchOverrides(t *testing.T) {
	if d := DecideSearch("brainstorm ideas but search the web first"); !d.Required || !d.Forced {
		t.Errorf("explicit 'search' should force search: %+v", d)
	}
	if d := DecideSearch("compare these but do not search"); d.Required || !d.Forced {
		t.Errorf("explicit 'do not search' should disable search: %+v", d)
	}
}

func TestClassifyIntent(t *testing.T) {
	cases := map[string]string{
		"compare Go and Node":            IntentCompare,
		"summarize this article":         IntentSummarize,
		"rewrite my bio":                 IntentRewrite,
		"brainstorm ideas for a logo":    IntentBrainstorm,
		"plan an architecture for voice": IntentPlanning,
		"research the latest on RAG":     IntentResearch,
		"tell me about the ocean":        IntentGeneral,
	}
	for q, want := range cases {
		if got := ClassifyIntent(q); got != want {
			t.Errorf("ClassifyIntent(%q) = %q, want %q", q, got, want)
		}
	}
}
