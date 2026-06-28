package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"time"

	_ "github.com/lib/pq"
)

// PGStore is the Postgres-backed Store. JSON-shaped fields (highlights,
// memory_used) are persisted as jsonb.
type PGStore struct {
	db *sql.DB
}

// NewPGStore opens a connection pool. The caller is responsible for running
// migrations (see migrations/ + `make migrate`).
func NewPGStore(ctx context.Context, dsn string) (*PGStore, error) {
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(30 * time.Minute)

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		_ = db.Close()
		return nil, err
	}
	return &PGStore{db: db}, nil
}

func jsonArr(v []string) []byte {
	if v == nil {
		v = []string{}
	}
	b, _ := json.Marshal(v)
	return b
}

func unmarshalArr(b []byte) []string {
	var out []string
	if len(b) > 0 {
		_ = json.Unmarshal(b, &out)
	}
	return out
}

func (s *PGStore) CreateSession(ctx context.Context, in *Session) error {
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO sessions (id, title, created_at, updated_at) VALUES ($1,$2,$3,$4)`,
		in.ID, in.Title, in.CreatedAt, in.UpdatedAt)
	return err
}

func (s *PGStore) GetSession(ctx context.Context, id string) (*Session, error) {
	var v Session
	err := s.db.QueryRowContext(ctx,
		`SELECT id, title, created_at, updated_at FROM sessions WHERE id=$1`, id).
		Scan(&v.ID, &v.Title, &v.CreatedAt, &v.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &v, err
}

func (s *PGStore) ListSessions(ctx context.Context, limit int) ([]Session, error) {
	if limit <= 0 {
		limit = 50
	}
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, title, created_at, updated_at FROM sessions ORDER BY updated_at DESC LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Session
	for rows.Next() {
		var v Session
		if err := rows.Scan(&v.ID, &v.Title, &v.CreatedAt, &v.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, v)
	}
	return out, rows.Err()
}

func (s *PGStore) TouchSession(ctx context.Context, id, title string) error {
	_, err := s.db.ExecContext(ctx,
		`UPDATE sessions SET updated_at=now(), title=COALESCE(NULLIF(title,''), $2) WHERE id=$1`,
		id, title)
	return err
}

func (s *PGStore) CreateMessage(ctx context.Context, m *Message) error {
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO messages (id, session_id, role, content, created_at) VALUES ($1,$2,$3,$4,$5)`,
		m.ID, m.SessionID, m.Role, m.Content, m.CreatedAt)
	return err
}

func (s *PGStore) GetMessage(ctx context.Context, id string) (*Message, error) {
	var v Message
	err := s.db.QueryRowContext(ctx,
		`SELECT id, session_id, role, content, created_at FROM messages WHERE id=$1`, id).
		Scan(&v.ID, &v.SessionID, &v.Role, &v.Content, &v.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &v, err
}

func (s *PGStore) ListMessages(ctx context.Context, sessionID string) ([]Message, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, session_id, role, content, created_at FROM messages WHERE session_id=$1 ORDER BY created_at ASC`,
		sessionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Message
	for rows.Next() {
		var v Message
		if err := rows.Scan(&v.ID, &v.SessionID, &v.Role, &v.Content, &v.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, v)
	}
	return out, rows.Err()
}

func (s *PGStore) CreateRun(ctx context.Context, r *AssistantRun) error {
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO assistant_runs (id, session_id, user_message_id, status, query, started_at, latency_ms, error, spoken_answer, display_answer, memory_used)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
		r.ID, r.SessionID, r.UserMessageID, r.Status, r.Query, r.StartedAt, r.LatencyMS, r.Error,
		r.SpokenAnswer, r.DisplayAnswer, jsonArr(r.MemoryUsed))
	return err
}

func (s *PGStore) GetRun(ctx context.Context, id string) (*AssistantRun, error) {
	var v AssistantRun
	var completed sql.NullTime
	var mem []byte
	err := s.db.QueryRowContext(ctx,
		`SELECT id, session_id, user_message_id, status, query, started_at, completed_at, latency_ms, error, spoken_answer, display_answer, memory_used
		 FROM assistant_runs WHERE id=$1`, id).
		Scan(&v.ID, &v.SessionID, &v.UserMessageID, &v.Status, &v.Query, &v.StartedAt, &completed,
			&v.LatencyMS, &v.Error, &v.SpokenAnswer, &v.DisplayAnswer, &mem)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if completed.Valid {
		v.CompletedAt = &completed.Time
	}
	v.MemoryUsed = unmarshalArr(mem)
	return &v, nil
}

func (s *PGStore) UpdateRun(ctx context.Context, r *AssistantRun) error {
	var completed any
	if r.CompletedAt != nil {
		completed = *r.CompletedAt
	}
	_, err := s.db.ExecContext(ctx,
		`UPDATE assistant_runs SET status=$2, completed_at=$3, latency_ms=$4, error=$5, spoken_answer=$6, display_answer=$7, memory_used=$8 WHERE id=$1`,
		r.ID, r.Status, completed, r.LatencyMS, r.Error, r.SpokenAnswer, r.DisplayAnswer, jsonArr(r.MemoryUsed))
	return err
}

func (s *PGStore) AddSource(ctx context.Context, src *Source) error {
	var published any
	if src.PublishedAt != nil {
		published = *src.PublishedAt
	}
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO sources (id, run_id, provider, title, url, domain, snippet, highlights, author, published_at, score, created_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
		src.ID, src.RunID, src.Provider, src.Title, src.URL, src.Domain, src.Snippet,
		jsonArr(src.Highlights), src.Author, published, src.Score, src.CreatedAt)
	return err
}

func (s *PGStore) ListSources(ctx context.Context, runID string) ([]Source, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, run_id, provider, title, url, domain, snippet, highlights, author, published_at, score, created_at
		 FROM sources WHERE run_id=$1 ORDER BY score DESC`, runID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Source
	for rows.Next() {
		var v Source
		var hl []byte
		var published sql.NullTime
		if err := rows.Scan(&v.ID, &v.RunID, &v.Provider, &v.Title, &v.URL, &v.Domain, &v.Snippet,
			&hl, &v.Author, &published, &v.Score, &v.CreatedAt); err != nil {
			return nil, err
		}
		v.Highlights = unmarshalArr(hl)
		if published.Valid {
			v.PublishedAt = &published.Time
		}
		out = append(out, v)
	}
	return out, rows.Err()
}

func (s *PGStore) AddBlock(ctx context.Context, b *AnswerBlock) error {
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO answer_blocks (id, run_id, type, title, payload_json, priority, created_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7)`,
		b.ID, b.RunID, b.Type, b.Title, b.PayloadJSON, b.Priority, b.CreatedAt)
	return err
}

func (s *PGStore) ListBlocks(ctx context.Context, runID string) ([]AnswerBlock, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, run_id, type, title, payload_json, priority, created_at
		 FROM answer_blocks WHERE run_id=$1 ORDER BY priority ASC`, runID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []AnswerBlock
	for rows.Next() {
		var v AnswerBlock
		if err := rows.Scan(&v.ID, &v.RunID, &v.Type, &v.Title, &v.PayloadJSON, &v.Priority, &v.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, v)
	}
	return out, rows.Err()
}

func (s *PGStore) Ping(ctx context.Context) error { return s.db.PingContext(ctx) }
func (s *PGStore) Close() error                   { return s.db.Close() }
