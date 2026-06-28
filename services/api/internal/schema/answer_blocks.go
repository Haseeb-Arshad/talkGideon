// Package schema defines Gideon's UI block contract and validates/repairs
// model-generated blocks before they reach the frontend. The frontend renders
// these blocks directly, so an invalid block is a broken UI — every block is
// validated, and repaired or dropped.
package schema

import (
	"encoding/json"
	"time"
)

// Block types the frontend knows how to render.
const (
	TypeSummaryCard        = "summary_card"
	TypeComparisonTable    = "comparison_table"
	TypeRecommendationCard = "recommendation_card"
	TypeSourceGrid         = "source_grid"
	TypeTimeline           = "timeline"
	TypeWorkflow           = "workflow"
	TypeArchitecture       = "architecture"
	TypeWarning            = "warning"
	TypeCode               = "code"
	TypeFollowUpChips      = "follow_up_chips"
	TypeMemoryUsed         = "memory_used"
)

// KnownTypes is the allow-list. Anything else is dropped.
var KnownTypes = map[string]bool{
	TypeSummaryCard:        true,
	TypeComparisonTable:    true,
	TypeRecommendationCard: true,
	TypeSourceGrid:         true,
	TypeTimeline:           true,
	TypeWorkflow:           true,
	TypeArchitecture:       true,
	TypeWarning:            true,
	TypeCode:               true,
	TypeFollowUpChips:      true,
	TypeMemoryUsed:         true,
}

// Block is one unit of generated UI.
type Block struct {
	ID        string          `json:"id"`
	Type      string          `json:"type"`
	Title     string          `json:"title"`
	Priority  int             `json:"priority"`
	Payload   json.RawMessage `json:"payload"`
	CreatedAt time.Time       `json:"createdAt"`
}

// payload returns the payload decoded into a generic map (nil if not an object).
func (b *Block) payload() map[string]any {
	if len(b.Payload) == 0 {
		return nil
	}
	var m map[string]any
	if err := json.Unmarshal(b.Payload, &m); err != nil {
		return nil
	}
	return m
}
