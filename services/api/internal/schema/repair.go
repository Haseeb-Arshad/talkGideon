package schema

import (
	"strings"
	"time"

	"github.com/talkgideon/api/internal/id"
)

// defaultTitles give a sensible human title when the model omits one.
var defaultTitles = map[string]string{
	TypeSummaryCard:        "Summary",
	TypeComparisonTable:    "Comparison",
	TypeRecommendationCard: "Recommendation",
	TypeSourceGrid:         "Sources",
	TypeTimeline:           "Timeline",
	TypeWorkflow:           "Workflow",
	TypeArchitecture:       "Architecture",
	TypeWarning:            "Heads up",
	TypeCode:               "Code",
	TypeFollowUpChips:      "Continue",
	TypeMemoryUsed:         "Memory used",
}

// Repair attempts to fix the simple, safe problems on a block in place. It
// returns true if the block is renderable afterwards. Structural problems
// (unknown type, bad payload, missing required payload fields) are NOT repaired
// — the caller drops those.
func Repair(b *Block) bool {
	if b.ID == "" {
		b.ID = id.New("block")
	}
	if b.CreatedAt.IsZero() {
		b.CreatedAt = time.Now().UTC()
	}
	if strings.TrimSpace(b.Title) == "" {
		if dt, ok := defaultTitles[b.Type]; ok {
			b.Title = dt
		} else {
			b.Title = "Untitled"
		}
	}
	if b.Priority <= 0 {
		b.Priority = 50 // middle-of-the-road default
	}
	return Validate(b) == nil
}

// ValidateAndRepair runs validate -> repair-if-repairable -> revalidate.
// Returns (renderable, dropped-reason). When renderable is false the block must
// not be sent to the frontend.
func ValidateAndRepair(b *Block) (bool, string) {
	verr := Validate(b)
	if verr == nil {
		return true, ""
	}
	if !verr.Repairable {
		return false, verr.Error()
	}
	if Repair(b) {
		return true, ""
	}
	if v := Validate(b); v != nil {
		return false, v.Error()
	}
	return true, ""
}

// SanitizeBlocks validates/repairs a batch, returning only renderable blocks
// plus the list of drop reasons (for logging/observability). Output is stable
// and re-priorities sequentially so the frontend gets a clean ordering.
func SanitizeBlocks(blocks []Block) (kept []Block, dropped []string) {
	for i := range blocks {
		b := blocks[i]
		ok, reason := ValidateAndRepair(&b)
		if ok {
			kept = append(kept, b)
		} else {
			dropped = append(dropped, b.Type+": "+reason)
		}
	}
	// Sort by priority ascending while keeping it simple & stable.
	for i := 1; i < len(kept); i++ {
		for j := i; j > 0 && kept[j].Priority < kept[j-1].Priority; j-- {
			kept[j], kept[j-1] = kept[j-1], kept[j]
		}
	}
	return kept, dropped
}
