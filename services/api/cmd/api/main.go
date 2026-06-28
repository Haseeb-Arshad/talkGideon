// Command api is Gideon's intelligence gateway: an HTTP + SSE service that
// plans, searches (Exa), generates validated UI blocks, and stores memory.
package main

import (
	"context"
	"errors"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/talkgideon/api/internal/assistant"
	"github.com/talkgideon/api/internal/config"
	ghttp "github.com/talkgideon/api/internal/http"
	"github.com/talkgideon/api/internal/http/handlers"
	"github.com/talkgideon/api/internal/logging"
	"github.com/talkgideon/api/internal/memory"
	"github.com/talkgideon/api/internal/store"
	"github.com/talkgideon/api/internal/stream"
	"github.com/talkgideon/api/internal/tools"
	"github.com/talkgideon/api/internal/tools/exa"
)

func main() {
	cfg := config.Load()
	log := logging.New(cfg.Environment)

	// --- Store: Postgres when configured, in-memory otherwise (dev) ---------
	var st store.Store
	if cfg.DatabaseURL != "" {
		ctx, cancel := context.WithTimeout(context.Background(), 6*time.Second)
		pg, err := store.NewPGStore(ctx, cfg.DatabaseURL)
		cancel()
		if err != nil {
			log.Error("postgres connect failed, falling back to in-memory store", "err", err)
			st = store.NewMemStore()
		} else {
			log.Info("connected to postgres")
			st = pg
		}
	} else {
		log.Warn("DATABASE_URL not set — using in-memory store (data is not persisted)")
		st = store.NewMemStore()
	}
	defer st.Close()

	// --- Memory (Obsidian vault) -------------------------------------------
	obs, err := memory.NewObsidianStore(cfg.ObsidianVault)
	if err != nil {
		log.Error("could not open vault", "path", cfg.ObsidianVault, "err", err)
		os.Exit(1)
	}
	mem := memory.NewService(obs)

	// --- Search: Exa when keyed, deterministic mock otherwise --------------
	var searcher tools.Searcher
	if cfg.ExaAPIKey != "" {
		searcher = exa.New(cfg.ExaAPIKey, cfg.ExaTimeout)
		log.Info("exa search enabled")
	} else {
		searcher = tools.NewMockSearcher()
		log.Warn("EXA_API_KEY not set — using mock searcher")
	}

	// --- Model: mock for MVP (swap in a real provider behind ModelClient) --
	var model assistant.ModelClient = assistant.NewMockModelClient()
	log.Info("model provider", "provider", cfg.ModelProvider)

	broker := stream.NewBroker()
	engine := assistant.NewEngine(st, mem, searcher, model, log)

	h := &handlers.Handlers{
		Store:  st,
		Memory: mem,
		Engine: engine,
		Broker: broker,
		Log:    log,
		Cfg:    cfg,
	}

	router := ghttp.NewRouter(h, log, cfg.AllowedOrigins)

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
		// No WriteTimeout: SSE responses are long-lived.
		IdleTimeout: 120 * time.Second,
	}

	// --- Run with graceful shutdown ----------------------------------------
	go func() {
		log.Info("gideon api listening", "addr", srv.Addr, "env", cfg.Environment)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Error("server error", "err", err)
			os.Exit(1)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop

	log.Info("shutting down…")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Error("shutdown error", "err", err)
	}
	log.Info("bye")
}
