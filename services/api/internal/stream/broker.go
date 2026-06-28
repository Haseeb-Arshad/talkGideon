package stream

import (
	"context"
	"sync"
)

// Broker tracks in-flight runs so they can be cancelled (e.g. on client
// disconnect, or via a future cancel endpoint). It is concurrency-safe.
type Broker struct {
	mu     sync.Mutex
	cancel map[string]context.CancelFunc
}

func NewBroker() *Broker {
	return &Broker{cancel: map[string]context.CancelFunc{}}
}

// Begin registers a run and returns a cancellable context plus a release func
// to call when the run finishes.
func (b *Broker) Begin(parent context.Context, runID string) (context.Context, func()) {
	ctx, cancel := context.WithCancel(parent)
	b.mu.Lock()
	b.cancel[runID] = cancel
	b.mu.Unlock()
	return ctx, func() {
		b.mu.Lock()
		delete(b.cancel, runID)
		b.mu.Unlock()
		cancel()
	}
}

// Cancel stops an active run if present. Returns true if a run was cancelled.
func (b *Broker) Cancel(runID string) bool {
	b.mu.Lock()
	defer b.mu.Unlock()
	if c, ok := b.cancel[runID]; ok {
		c()
		delete(b.cancel, runID)
		return true
	}
	return false
}

// Active reports the number of in-flight runs.
func (b *Broker) Active() int {
	b.mu.Lock()
	defer b.mu.Unlock()
	return len(b.cancel)
}
