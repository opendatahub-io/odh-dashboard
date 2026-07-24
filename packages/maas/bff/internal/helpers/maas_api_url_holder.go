package helper

import (
	"context"
	"crypto/x509"
	"log/slog"
	"sync"
	"time"

	"github.com/opendatahub-io/maas-library/bff/internal/config"
)

const (
	maasDiscoveryInitialBackoff = 5 * time.Second
	maasDiscoveryMaxBackoff     = 30 * time.Second
)

// MaasApiURLHolder stores the discovered (or configured) MaaS API base URL.
// It is safe for concurrent use.
type MaasApiURLHolder struct {
	mu  sync.RWMutex
	url string
}

// NewMaasApiURLHolder creates a holder, optionally seeded with an initial URL.
func NewMaasApiURLHolder(initialURL string) *MaasApiURLHolder {
	return &MaasApiURLHolder{url: initialURL}
}

// Ready reports whether a non-empty MaaS API URL is available.
func (h *MaasApiURLHolder) Ready() bool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.url != ""
}

// URL returns the current MaaS API URL and whether it is set.
func (h *MaasApiURLHolder) URL() (string, bool) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	if h.url == "" {
		return "", false
	}
	return h.url, true
}

// Set stores the MaaS API URL.
func (h *MaasApiURLHolder) Set(url string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.url = url
}

// DiscoverMaasApiURLFunc discovers the MaaS API URL. Production uses DiscoverMaasApiURL;
// tests may inject a stub.
type DiscoverMaasApiURLFunc func(ctx context.Context, cfg config.EnvConfig, logger *slog.Logger, rootCAs *x509.CertPool) (string, error)

// OnMaasApiURLReady is called when discovery succeeds. Return an error to keep retrying
// (e.g. if wiring repositories failed). On success the holder is updated by the loop.
type OnMaasApiURLReady func(url string) error

// StartMaasApiDiscoveryLoop retries discovery in the background until it succeeds or ctx is cancelled.
// Call this after an initial discovery attempt has already failed so the first retry waits for backoff.
func StartMaasApiDiscoveryLoop(
	ctx context.Context,
	cfg config.EnvConfig,
	logger *slog.Logger,
	rootCAs *x509.CertPool,
	holder *MaasApiURLHolder,
	onReady OnMaasApiURLReady,
	discover DiscoverMaasApiURLFunc,
) {
	if discover == nil {
		discover = DiscoverMaasApiURL
	}

	go runMaasApiDiscoveryLoop(ctx, cfg, logger, rootCAs, holder, onReady, discover, maasDiscoveryInitialBackoff, maasDiscoveryMaxBackoff)
}

func runMaasApiDiscoveryLoop(
	ctx context.Context,
	cfg config.EnvConfig,
	logger *slog.Logger,
	rootCAs *x509.CertPool,
	holder *MaasApiURLHolder,
	onReady OnMaasApiURLReady,
	discover DiscoverMaasApiURLFunc,
	initialBackoff, maxBackoff time.Duration,
) {
	backoff := initialBackoff

	for {
		timer := time.NewTimer(backoff)
		select {
		case <-ctx.Done():
			timer.Stop()
			logger.Info("MaaS API discovery retry loop stopped")
			return
		case <-timer.C:
		}

		discoveredURL, err := discover(ctx, cfg, logger, rootCAs)
		if err != nil {
			backoff = nextDiscoveryBackoff(backoff, maxBackoff)
			logger.Warn("MaaS API discovery failed; will retry",
				"error", err,
				"retryIn", backoff.String())
			continue
		}

		if onReady != nil {
			if wireErr := onReady(discoveredURL); wireErr != nil {
				backoff = nextDiscoveryBackoff(backoff, maxBackoff)
				logger.Error("Discovered MaaS API URL but failed to wire clients; will retry",
					"url", discoveredURL,
					"error", wireErr,
					"retryIn", backoff.String())
				continue
			}
		}

		holder.Set(discoveredURL)
		logger.Info("MaaS API URL discovered after retry", "url", discoveredURL)
		return
	}
}

func nextDiscoveryBackoff(current, maxBackoff time.Duration) time.Duration {
	next := current * 2
	if next > maxBackoff {
		return maxBackoff
	}
	return next
}
