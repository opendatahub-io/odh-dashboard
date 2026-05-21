package api

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"sync"
	"time"

	"github.com/opendatahub-io/gen-ai/internal/constants"
)

// sseHeartbeat sends periodic SSE comment lines to keep the connection alive
// through intermediary proxies (e.g., OpenShift HAProxy defaults to closing
// idle connections after 30 seconds). SSE comments (lines starting with ':')
// are silently ignored by all conforming clients per the SSE specification.
type sseHeartbeat struct {
	writer   http.ResponseWriter
	flusher  http.Flusher
	mu       *sync.Mutex
	logger   *slog.Logger
	stopCh   chan struct{}
	stopOnce sync.Once
}

func newSSEHeartbeat(w http.ResponseWriter, f http.Flusher, mu *sync.Mutex, logger *slog.Logger) *sseHeartbeat {
	return &sseHeartbeat{
		writer:  w,
		flusher: f,
		mu:      mu,
		logger:  logger,
		stopCh:  make(chan struct{}),
	}
}

// start begins sending heartbeat comments at a fixed interval. Blocks until
// stopped or context is cancelled — call in a goroutine.
func (h *sseHeartbeat) start(ctx context.Context) {
	ticker := time.NewTicker(constants.SSEHeartbeatInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			h.mu.Lock()
			_, err := fmt.Fprint(h.writer, ": keepalive\n\n")
			if err != nil {
				h.mu.Unlock()
				h.logger.Debug("SSE heartbeat write failed, client likely disconnected", "error", err)
				return
			}
			h.flusher.Flush()
			h.mu.Unlock()
		case <-h.stopCh:
			return
		case <-ctx.Done():
			return
		}
	}
}

func (h *sseHeartbeat) stop() {
	// Ensure we only close the stopCh once to avoid panics
	h.stopOnce.Do(func() { close(h.stopCh) })
}
