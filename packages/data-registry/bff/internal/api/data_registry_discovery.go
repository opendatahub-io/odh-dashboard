package api

import (
	"context"
	"log/slog"
	"time"

	"github.com/opendatahub-io/data-registry/bff/internal/config"
	helper "github.com/opendatahub-io/data-registry/bff/internal/helpers"
	k8s "github.com/opendatahub-io/data-registry/bff/internal/integrations/kubernetes"
)

const (
	// dataRegistryConfigMapLookupTimeout bounds every individual ConfigMap read — both the
	// initial attempt in NewApp and each retry below — so a stalled Kubernetes API server can
	// never block BFF startup, nor pin the retry loop, indefinitely.
	dataRegistryConfigMapLookupTimeout = 5 * time.Second

	dataRegistryDiscoveryInitialBackoff = 5 * time.Second
	dataRegistryDiscoveryMaxBackoff     = 30 * time.Second
)

// startDataRegistryDiscoveryLoop retries the Data Registry API URL ConfigMap lookup in the
// background, with exponential backoff, until it succeeds or ctx is cancelled (on Shutdown).
//
// This mirrors the MaaS BFF's discovery-retry pattern (see
// packages/maas/bff/internal/helpers/maas_api_url_holder.go) so the ConfigMap can be created
// after this BFF has already started — e.g. because the Data Registry operator (RHAISTRAT-2381)
// deploys after this pod does — without requiring a restart. Until discovery succeeds, proxy
// routes keep returning 503 (see DataRegistryReverseProxy), matching the initial startup
// behavior; holder is updated in place once a valid URL is found.
func startDataRegistryDiscoveryLoop(ctx context.Context, cfg config.EnvConfig, logger *slog.Logger, holder *helper.StringHolder) {
	go runDataRegistryDiscoveryLoop(ctx, cfg, logger, holder, dataRegistryDiscoveryInitialBackoff, dataRegistryDiscoveryMaxBackoff)
}

func runDataRegistryDiscoveryLoop(
	ctx context.Context,
	cfg config.EnvConfig,
	logger *slog.Logger,
	holder *helper.StringHolder,
	initialBackoff, maxBackoff time.Duration,
) {
	backoff := initialBackoff

	for {
		timer := time.NewTimer(backoff)
		select {
		case <-ctx.Done():
			timer.Stop()
			logger.Info("Data Registry API URL discovery retry loop stopped")
			return
		case <-timer.C:
		}

		attemptCtx, cancel := context.WithTimeout(ctx, dataRegistryConfigMapLookupTimeout)
		resolvedURL, err := k8s.ResolveDataRegistryAPIURL(attemptCtx, cfg.DataRegistryConfigMapName, cfg.DataRegistryConfigMapKey, logger)
		cancel()
		if err != nil {
			backoff = nextDataRegistryDiscoveryBackoff(backoff, maxBackoff)
			logger.Warn("Data Registry API URL still not available; will retry",
				slog.Any("error", err), slog.Duration("retryIn", backoff))
			continue
		}

		holder.Set(resolvedURL)
		logger.Info("Data Registry API URL discovered", slog.String("url", resolvedURL))
		return
	}
}

func nextDataRegistryDiscoveryBackoff(current, maxBackoff time.Duration) time.Duration {
	next := current * 2
	if next > maxBackoff {
		return maxBackoff
	}
	return next
}
