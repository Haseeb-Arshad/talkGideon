# Gideon API — intelligence gateway

The Go backend that powers Gideon (talkgideon.com). It is **not** a CRUD service
— it's an assistant *run engine*: it receives a query, decides whether tools are
needed, calls Exa for web search when appropriate, streams events to the
frontend over SSE, validates generated UI blocks, stores useful memories as
Obsidian-compatible Markdown, and returns a structured answer.

The frontend (TanStack Start + React) never calls Exa, the model, or the vault
directly — everything goes through this gateway.

## Quickstart (zero config)

No Postgres, no Exa key, no model key needed to run — sensible mocks fill in:

```bash
cd services/api
cp .env.example .env        # optional; defaults already work
make dev                    # or: go run ./cmd/api
```

Then, in another shell:

```bash
make smoke                  # health + create a run + stream events for 5s
```

You'll see SSE frames stream in: `run.started → assistant.thinking →
search.started → search.result… → ui.block.completed… → run.completed`.

### With real infrastructure

```bash
docker compose up -d                                   # Postgres + Redis
export DATABASE_URL=postgres://gideon:gideon@localhost:5432/gideon?sslmode=disable
make migrate                                           # apply 001_init.sql
export EXA_API_KEY=...          # enables real web search
# MODEL_PROVIDER/MODEL_API_KEY  # swap the mock for a real model (see below)
make dev
```

## How a run works

`POST /api/runs` queues a run and returns a `runId` + `eventsUrl`. The frontend
then opens an `EventSource` on `GET /api/runs/{runId}/events`, which executes the
engine and streams the answer as it's built:

1. `run.started` — emitted **immediately** (first byte < 200 ms locally).
2. Plan: deterministic intent + search decision (`internal/tools/router.go`).
3. If search is needed → `search.started`, normalized `search.result` events,
   `sources.updated`, `search.completed`. Web content is treated as **untrusted
   evidence** and run through prompt-injection sanitization.
4. Relevant memory is retrieved from the Obsidian vault → `memory.used`.
5. Generation streams `answer.delta` + `ui.block.*`. **Every block is validated**
   (`internal/schema`); invalid blocks are repaired or dropped — never sent.
6. The answer + sources + blocks are persisted; durable memories may be saved
   (`memory.saved`); `run.completed` closes the stream.

Reconnecting to a finished run **replays** its persisted state as events.

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | liveness + dependency status |
| POST | `/api/sessions` | create a session |
| GET | `/api/sessions` | list sessions |
| GET | `/api/sessions/{sessionId}` | session + messages |
| POST | `/api/sessions/{sessionId}/messages` | append a message |
| POST | `/api/runs` | queue an assistant run |
| GET | `/api/runs/{runId}` | run + assembled answer |
| GET | `/api/runs/{runId}/events` | **SSE** stream (executes/replays the run) |
| GET | `/api/runs/{runId}/sources` | normalized sources |
| GET | `/api/runs/{runId}/memory-used` | memories that shaped the answer |
| GET | `/api/memory/recent` | recent memories |
| GET | `/api/memory/search?q=` | search memories |
| POST | `/api/memory` | create a memory |
| PATCH | `/api/memory/{memoryId}` | update a memory |
| DELETE | `/api/memory/{memoryId}` | delete a memory |

### SSE event types

`run.started`, `run.status`, `assistant.thinking`, `search.started`,
`search.result`, `search.completed`, `answer.delta`, `ui.block.started`,
`ui.block.completed`, `sources.updated`, `memory.used`, `memory.saved`,
`run.completed`, `run.error`.

Each frame is `event: <type>\ndata: <json>\n\n`; every payload carries `runId`,
`type`, and `timestamp`.

### UI block contract

Every block: `{ id, type, title, priority, payload, createdAt }`. Allowed types:
`summary_card`, `comparison_table`, `recommendation_card`, `source_grid`,
`timeline`, `workflow`, `architecture`, `warning`, `code`, `follow_up_chips`,
`memory_used`. Validation lives in `internal/schema` (validate → repair → drop).

## Memory (Obsidian)

Memories are Markdown files with YAML frontmatter under
`<vault>/Gideon/Memories/<Type>/YYYY-MM-DD-slug.md`. Types: `preference`,
`project`, `decision`, `instruction`, `fact`. The backend owns all writes; the
API exposes clean metadata, **not** file paths. Save rules
(`internal/memory/types.go`) keep durable, useful memories and reject one-offs
and secrets.

## Configuration

See `.env.example`. Key vars: `PORT`, `DATABASE_URL` (empty → in-memory store),
`REDIS_URL`, `EXA_API_KEY` (empty → mock searcher), `MODEL_PROVIDER` /
`MODEL_API_KEY` (default `mock`), `OBSIDIAN_VAULT_PATH`, `ALLOWED_ORIGINS`,
`ENVIRONMENT`.

## Swapping in a real model

Implement `assistant.ModelClient` (`Generate` + `Stream`) for your provider and
wire it in `cmd/api/main.go` based on `cfg.ModelProvider`. The engine, schema
validation, and streaming are provider-agnostic. The default `MockModelClient`
produces valid structured answers offline so the whole pipeline is testable.

## Layout

```
cmd/api            entrypoint + graceful shutdown
internal/
  config           env configuration
  logging          slog setup
  telemetry        per-run observation logging
  id               prefixed id + slug generation
  store            domain types + Store iface (in-memory + Postgres)
  schema           UI block types, validation, repair
  tools            intent/search router, Searcher iface, mock searcher
    exa            Exa client, types, normalization (raw responses never leak)
  memory           Obsidian markdown store, frontmatter, search, save rules
  assistant        events, ModelClient (+mock), planner, prompt/response
                   builders, injection safety, run engine
  http             router, middleware, handlers, SSE stream + broker
migrations         001_init.sql
```

## Testing

```bash
make test     # unit tests
make lint     # go vet + gofmt check
make eval     # evaluate the intent/search router on sample queries
```

Critical logic is unit-tested: the intent/search router, Exa normalization
(dedup/ranking), UI block validation/repair, memory frontmatter round-trip,
memory search, SSE frame formatting, and prompt-injection filtering.
