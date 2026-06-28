// Package store defines Gideon's persistence domain (sessions, messages, runs,
// sources, answer blocks) and a Store interface. Two implementations exist: an
// in-memory store (dev/test, no dependencies) and a Postgres store.
package store

import (
	"context"
	"errors"
	"time"
)

var ErrNotFound = errors.New("not found")

// Run status lifecycle.
const (
	RunQueued     = "queued"
	RunRunning    = "running"
	RunSearching  = "searching"
	RunGenerating = "generating"
	RunCompleted  = "completed"
	RunFailed     = "failed"
	RunCancelled  = "cancelled"
)

// Message roles.
const (
	RoleUser      = "user"
	RoleAssistant = "assistant"
	RoleSystem    = "system"
)

type Session struct {
	ID        string    `json:"id"`
	Title     string    `json:"title"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type Message struct {
	ID        string    `json:"id"`
	SessionID string    `json:"sessionId"`
	Role      string    `json:"role"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"createdAt"`
}

type AssistantRun struct {
	ID            string     `json:"id"`
	SessionID     string     `json:"sessionId"`
	UserMessageID string     `json:"userMessageId"`
	Status        string     `json:"status"`
	Query         string     `json:"query"`
	StartedAt     time.Time  `json:"startedAt"`
	CompletedAt   *time.Time `json:"completedAt,omitempty"`
	LatencyMS     int64      `json:"latencyMs"`
	Error         string     `json:"error,omitempty"`

	// Result fields, filled when the run completes.
	SpokenAnswer  string   `json:"spokenAnswer,omitempty"`
	DisplayAnswer string   `json:"displayAnswer,omitempty"`
	MemoryUsed    []string `json:"memoryUsed,omitempty"`
}

type Source struct {
	ID          string     `json:"id"`
	RunID       string     `json:"runId"`
	Provider    string     `json:"provider"`
	Title       string     `json:"title"`
	URL         string     `json:"url"`
	Domain      string     `json:"domain"`
	Snippet     string     `json:"snippet"`
	Highlights  []string   `json:"highlights,omitempty"`
	Author      string     `json:"author,omitempty"`
	PublishedAt *time.Time `json:"publishedAt,omitempty"`
	Score       float64    `json:"score"`
	CreatedAt   time.Time  `json:"createdAt"`
}

type AnswerBlock struct {
	ID          string    `json:"id"`
	RunID       string    `json:"runId"`
	Type        string    `json:"type"`
	Title       string    `json:"title"`
	Priority    int       `json:"priority"`
	PayloadJSON []byte    `json:"payload"`
	CreatedAt   time.Time `json:"createdAt"`
}

// Store is the persistence contract. All methods accept a context so external
// calls can be cancelled / time-bounded.
type Store interface {
	// Sessions
	CreateSession(ctx context.Context, s *Session) error
	GetSession(ctx context.Context, id string) (*Session, error)
	ListSessions(ctx context.Context, limit int) ([]Session, error)
	TouchSession(ctx context.Context, id, title string) error

	// Messages
	CreateMessage(ctx context.Context, m *Message) error
	GetMessage(ctx context.Context, id string) (*Message, error)
	ListMessages(ctx context.Context, sessionID string) ([]Message, error)

	// Runs
	CreateRun(ctx context.Context, r *AssistantRun) error
	GetRun(ctx context.Context, id string) (*AssistantRun, error)
	UpdateRun(ctx context.Context, r *AssistantRun) error

	// Sources & blocks
	AddSource(ctx context.Context, s *Source) error
	ListSources(ctx context.Context, runID string) ([]Source, error)
	AddBlock(ctx context.Context, b *AnswerBlock) error
	ListBlocks(ctx context.Context, runID string) ([]AnswerBlock, error)

	// Lifecycle
	Ping(ctx context.Context) error
	Close() error
}
