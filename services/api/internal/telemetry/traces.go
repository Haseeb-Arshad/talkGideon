// Package telemetry records per-run observations. Every assistant run emits a
// single structured log line with the fields needed to reason about behavior
// and latency.
package telemetry

import (
	"log/slog"
	"time"
)

// RunObservation captures everything we want to know about one run.
type RunObservation struct {
	RunID          string
	SessionID      string
	Route          string
	Intent         string
	SearchRequired bool
	ToolsUsed      []string
	SourceCount    int
	MemoryCount    int
	LatencyMS      int64
	ErrorType      string

	start time.Time
}

// Start stamps the begin time so LatencyMS can be derived on Finish.
func Start(runID, sessionID, route string) *RunObservation {
	return &RunObservation{
		RunID:     runID,
		SessionID: sessionID,
		Route:     route,
		ToolsUsed: []string{},
		start:     time.Now(),
	}
}

func (o *RunObservation) Elapsed() time.Duration { return time.Since(o.start) }

// Finish writes the observation. It is safe to call exactly once at run end.
func (o *RunObservation) Finish(log *slog.Logger) {
	if o.LatencyMS == 0 {
		o.LatencyMS = o.Elapsed().Milliseconds()
	}
	log.Info("run.observation",
		"run_id", o.RunID,
		"session_id", o.SessionID,
		"route", o.Route,
		"intent", o.Intent,
		"search_required", o.SearchRequired,
		"tools_used", o.ToolsUsed,
		"source_count", o.SourceCount,
		"memory_count", o.MemoryCount,
		"latency_ms", o.LatencyMS,
		"error_type", o.ErrorType,
	)
}
