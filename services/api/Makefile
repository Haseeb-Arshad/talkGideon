# Gideon API — developer commands.
# On Windows, run these from Git Bash (the repo's shell), or use the equivalent
# `go` commands directly.

DATABASE_URL ?= postgres://gideon:gideon@localhost:5432/gideon?sslmode=disable
PORT ?= 8787
BASE ?= http://localhost:$(PORT)

.PHONY: dev test migrate seed lint eval smoke build run tidy

## dev: run the API with live config (in-memory store if DATABASE_URL unset)
dev:
	go run ./cmd/api

## build: compile the binary
build:
	go build -o bin/api ./cmd/api

## run: build then run
run: build
	./bin/api

## test: run all unit tests
test:
	go test ./...

## tidy: sync go.mod/go.sum
tidy:
	go mod tidy

## migrate: apply SQL migrations (requires psql + a running Postgres)
migrate:
	psql "$(DATABASE_URL)" -f migrations/001_init.sql

## seed: insert a sample memory so the vault/UI has content
seed:
	curl -s -X POST $(BASE)/api/memory \
	  -H 'Content-Type: application/json' \
	  -d '{"title":"Warm minimal UI","content":"User prefers warm minimal personal-intelligence UI over blue neon cyberpunk dashboard UI.","type":"preference","tags":["gideon","ui"],"confidence":0.9}' | tee /dev/null
	@echo "\nseeded."

## lint: vet + gofmt check
lint:
	go vet ./...
	@unformatted=$$(gofmt -l .); if [ -n "$$unformatted" ]; then echo "gofmt needed:"; echo "$$unformatted"; exit 1; fi
	@echo "lint ok"

## eval: evaluate the deterministic intent/search router against sample queries
eval:
	go test ./internal/tools/... -run 'Decide|Intent' -v

## smoke: hit a RUNNING server — health, create a run, stream a few events
smoke:
	@echo "== health =="; curl -s $(BASE)/health; echo
	@echo "== create run =="; \
	  RUN=$$(curl -s -X POST $(BASE)/api/runs -H 'Content-Type: application/json' \
	    -d '{"query":"Compare Go and Node for realtime voice agents"}'); \
	  echo "$$RUN"; \
	  RID=$$(echo "$$RUN" | sed -n 's/.*"runId":"\([^"]*\)".*/\1/p'); \
	  echo "== stream $$RID (5s) =="; \
	  curl -s -N --max-time 5 $(BASE)/api/runs/$$RID/events || true
