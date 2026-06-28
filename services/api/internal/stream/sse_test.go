package stream

import (
	"strings"
	"testing"

	"github.com/talkgideon/api/internal/assistant"
)

func TestFormatFrame(t *testing.T) {
	ev := assistant.Event{
		Type: assistant.EvSearchStarted,
		Data: map[string]any{"runId": "run_123", "message": "Searching trusted sources…"},
	}
	frame, err := FormatFrame(ev)
	if err != nil {
		t.Fatalf("FormatFrame error: %v", err)
	}
	if !strings.HasPrefix(frame, "event: search.started\n") {
		t.Errorf("missing/incorrect event line: %q", frame)
	}
	if !strings.Contains(frame, `"runId":"run_123"`) {
		t.Errorf("data missing runId: %q", frame)
	}
	if !strings.HasSuffix(frame, "\n\n") {
		t.Errorf("frame must end with blank line: %q", frame)
	}
	// data line present
	if !strings.Contains(frame, "\ndata: {") {
		t.Errorf("missing data line: %q", frame)
	}
}
