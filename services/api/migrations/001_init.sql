-- 001_init.sql — Gideon intelligence gateway schema.
-- Apply with: make migrate  (psql "$DATABASE_URL" -f migrations/001_init.sql)

BEGIN;

CREATE TABLE IF NOT EXISTS sessions (
    id         TEXT PRIMARY KEY,
    title      TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
    id         TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    role       TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
    content    TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, created_at);

CREATE TABLE IF NOT EXISTS assistant_runs (
    id              TEXT PRIMARY KEY,
    session_id      TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    user_message_id TEXT,
    status          TEXT NOT NULL DEFAULT 'queued'
                    CHECK (status IN ('queued','running','searching','generating','completed','failed','cancelled')),
    query           TEXT NOT NULL,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at    TIMESTAMPTZ,
    latency_ms      BIGINT NOT NULL DEFAULT 0,
    error           TEXT NOT NULL DEFAULT '',
    -- result fields
    spoken_answer   TEXT NOT NULL DEFAULT '',
    display_answer  TEXT NOT NULL DEFAULT '',
    memory_used     JSONB NOT NULL DEFAULT '[]'
);
CREATE INDEX IF NOT EXISTS idx_runs_session ON assistant_runs(session_id, started_at DESC);

CREATE TABLE IF NOT EXISTS sources (
    id           TEXT PRIMARY KEY,
    run_id       TEXT NOT NULL REFERENCES assistant_runs(id) ON DELETE CASCADE,
    provider     TEXT NOT NULL,
    title        TEXT NOT NULL DEFAULT '',
    url          TEXT NOT NULL,
    domain       TEXT NOT NULL DEFAULT '',
    snippet      TEXT NOT NULL DEFAULT '',
    highlights   JSONB NOT NULL DEFAULT '[]',
    author       TEXT NOT NULL DEFAULT '',
    published_at TIMESTAMPTZ,
    score        DOUBLE PRECISION NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sources_run ON sources(run_id, score DESC);

CREATE TABLE IF NOT EXISTS answer_blocks (
    id           TEXT PRIMARY KEY,
    run_id       TEXT NOT NULL REFERENCES assistant_runs(id) ON DELETE CASCADE,
    type         TEXT NOT NULL,
    title        TEXT NOT NULL DEFAULT '',
    payload_json JSONB NOT NULL DEFAULT '{}',
    priority     INTEGER NOT NULL DEFAULT 50,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_blocks_run ON answer_blocks(run_id, priority);

-- memory_items mirrors the Obsidian vault for fast indexed search (optional;
-- the Obsidian Markdown files remain the source of truth for MVP).
CREATE TABLE IF NOT EXISTS memory_items (
    id            TEXT PRIMARY KEY,
    title         TEXT NOT NULL DEFAULT '',
    content       TEXT NOT NULL,
    type          TEXT NOT NULL CHECK (type IN ('preference','project','decision','instruction','fact')),
    source        TEXT NOT NULL DEFAULT 'conversation',
    confidence    DOUBLE PRECISION NOT NULL DEFAULT 0,
    tags_json     JSONB NOT NULL DEFAULT '[]',
    obsidian_path TEXT NOT NULL DEFAULT '',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_memory_type ON memory_items(type, updated_at DESC);

COMMIT;
