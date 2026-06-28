package schema

import (
	"encoding/json"
	"testing"
)

func raw(v any) json.RawMessage {
	b, _ := json.Marshal(v)
	return b
}

func TestValidateValidBlock(t *testing.T) {
	b := Block{
		ID: "block_1", Type: TypeSummaryCard, Title: "Summary", Priority: 1,
		Payload: raw(map[string]any{"text": "hello"}),
	}
	if err := Validate(&b); err != nil {
		t.Fatalf("expected valid, got %v", err)
	}
}

func TestValidateUnknownTypeDropped(t *testing.T) {
	b := Block{ID: "x", Type: "evil_block", Title: "t", Priority: 1, Payload: raw(map[string]any{"a": 1})}
	verr := Validate(&b)
	if verr == nil || verr.Repairable {
		t.Fatalf("unknown type must be a non-repairable error, got %v", verr)
	}
	ok, _ := ValidateAndRepair(&b)
	if ok {
		t.Error("unknown-type block must not be renderable")
	}
}

func TestValidateMissingRequiredPayloadDropped(t *testing.T) {
	b := Block{ID: "x", Type: TypeComparisonTable, Title: "Cmp", Priority: 1,
		Payload: raw(map[string]any{"columns": []string{"a"}})} // rows missing
	if ok, _ := ValidateAndRepair(&b); ok {
		t.Error("comparison_table without rows must be dropped")
	}
}

func TestRepairFillsMissingMeta(t *testing.T) {
	b := Block{Type: TypeSummaryCard, Payload: raw(map[string]any{"text": "hi"})} // no id/title/priority
	ok, reason := ValidateAndRepair(&b)
	if !ok {
		t.Fatalf("repairable block should become renderable: %s", reason)
	}
	if b.ID == "" || b.Title == "" || b.Priority <= 0 || b.CreatedAt.IsZero() {
		t.Errorf("repair did not fill metadata: %+v", b)
	}
	if b.Title != "Summary" {
		t.Errorf("expected default title 'Summary', got %q", b.Title)
	}
}

func TestSanitizeBlocksKeepsAndDrops(t *testing.T) {
	blocks := []Block{
		{Type: TypeSummaryCard, Payload: raw(map[string]any{"text": "ok"}), Priority: 5},
		{Type: "bogus", Payload: raw(map[string]any{"x": 1}), Priority: 1},
		{Type: TypeFollowUpChips, Payload: raw(map[string]any{"chips": []string{"next"}}), Priority: 2},
	}
	kept, dropped := SanitizeBlocks(blocks)
	if len(kept) != 2 {
		t.Fatalf("expected 2 kept, got %d", len(kept))
	}
	if len(dropped) != 1 {
		t.Fatalf("expected 1 dropped, got %d", len(dropped))
	}
	// Sorted by priority ascending: follow_up (2) before summary (5).
	if kept[0].Type != TypeFollowUpChips {
		t.Errorf("expected priority sort, got first = %q", kept[0].Type)
	}
}
