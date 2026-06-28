package schema

import (
	"encoding/json"
	"fmt"
)

// ValidationError describes why a block failed validation and whether the
// problem is repairable (vs. requiring the block to be dropped).
type ValidationError struct {
	Field      string
	Reason     string
	Repairable bool
}

func (e *ValidationError) Error() string {
	return fmt.Sprintf("%s: %s", e.Field, e.Reason)
}

// requiredKeys lists payload keys each block type must contain to be useful.
// Missing required keys make a block unsafe to render -> drop (unless repair
// can synthesize them, which we deliberately keep conservative).
var requiredKeys = map[string][]string{
	TypeSummaryCard:        {"text"},
	TypeComparisonTable:    {"columns", "rows"},
	TypeRecommendationCard: {"recommendation"},
	TypeSourceGrid:         {"sources"},
	TypeTimeline:           {"items"},
	TypeWorkflow:           {"steps"},
	TypeArchitecture:       {"nodes"},
	TypeWarning:            {"message"},
	TypeCode:               {"code"},
	TypeFollowUpChips:      {"chips"},
	TypeMemoryUsed:         {"items"},
}

// Validate checks a single block. It returns nil when the block is renderable.
func Validate(b *Block) *ValidationError {
	if b.Type == "" {
		return &ValidationError{Field: "type", Reason: "missing block type", Repairable: false}
	}
	if !KnownTypes[b.Type] {
		return &ValidationError{Field: "type", Reason: "unknown block type " + b.Type, Repairable: false}
	}
	if !json.Valid(b.Payload) || b.payload() == nil {
		return &ValidationError{Field: "payload", Reason: "payload is not a JSON object", Repairable: false}
	}
	if b.ID == "" {
		return &ValidationError{Field: "id", Reason: "missing id", Repairable: true}
	}
	if b.Title == "" {
		return &ValidationError{Field: "title", Reason: "missing title", Repairable: true}
	}
	if b.Priority <= 0 {
		return &ValidationError{Field: "priority", Reason: "priority must be >= 1", Repairable: true}
	}

	pl := b.payload()
	for _, key := range requiredKeys[b.Type] {
		v, ok := pl[key]
		if !ok || isEmptyValue(v) {
			return &ValidationError{Field: "payload." + key, Reason: "required field missing or empty", Repairable: false}
		}
	}
	return nil
}

func isEmptyValue(v any) bool {
	switch t := v.(type) {
	case nil:
		return true
	case string:
		return t == ""
	case []any:
		return len(t) == 0
	case map[string]any:
		return len(t) == 0
	}
	return false
}
