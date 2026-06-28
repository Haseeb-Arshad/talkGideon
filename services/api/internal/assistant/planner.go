package assistant

import "github.com/talkgideon/api/internal/tools"

// Plan is the result of classifying a query before execution.
type Plan struct {
	Intent         string `json:"intent"`
	SearchRequired bool   `json:"searchRequired"`
	SearchReason   string `json:"searchReason"`
	SearchForced   bool   `json:"searchForced"`
}

// PlanQuery runs the deterministic planner: intent classification + the search
// decision (with explicit user overrides).
func PlanQuery(query string) Plan {
	dec := tools.DecideSearch(query)
	return Plan{
		Intent:         tools.ClassifyIntent(query),
		SearchRequired: dec.Required,
		SearchReason:   dec.Reason,
		SearchForced:   dec.Forced,
	}
}
