package api

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/opendatahub-io/data-connect-hub/bff/internal/config"
	helper "github.com/opendatahub-io/data-connect-hub/bff/internal/helpers"
	k8s "github.com/opendatahub-io/data-connect-hub/bff/internal/integrations/kubernetes"
)

const (
	dchDiscoveryAttemptTimeout = 15 * time.Second
	dchDiscoveryInitialBackoff = 5 * time.Second
	dchDiscoveryMaxBackoff     = 30 * time.Second
	dchRHOAIGatewayNamespace   = "openshift-ingress"
	dchRHOAIGatewayName        = "data-science-gateway"
	dchODHGatewayNamespace     = "opendatahub"
	dchODHGatewayName          = "odh-gateway"
)

func discoverDataConnectHubURL(ctx context.Context, _ config.EnvConfig, logger *slog.Logger) (string, error) {
	candidates := [][2]string{
		{dchRHOAIGatewayNamespace, dchRHOAIGatewayName},
		{dchODHGatewayNamespace, dchODHGatewayName},
	}
	var lastErr error
	seen := make(map[[2]string]struct{})
	for _, candidate := range candidates {
		if candidate[0] == "" || candidate[1] == "" {
			continue
		}
		if _, ok := seen[candidate]; ok {
			continue
		}
		seen[candidate] = struct{}{}
		if url, err := k8s.ResolveDataConnectHubGatewayURL(ctx, candidate[0], candidate[1], logger); err == nil {
			return url, nil
		} else {
			lastErr = err
		}
	}
	if lastErr != nil {
		return "", fmt.Errorf("DCH gateway discovery failed for all configured gateways: %w", lastErr)
	}
	return "", fmt.Errorf("gateway namespace and name are not configured")
}

func startDataConnectHubDiscovery(ctx context.Context, cfg config.EnvConfig, logger *slog.Logger, holder *helper.StringHolder) {
	go func() {
		backoff := dchDiscoveryInitialBackoff
		for {
			select {
			case <-ctx.Done():
				return
			case <-time.After(backoff):
			}

			attemptCtx, cancel := context.WithTimeout(ctx, dchDiscoveryAttemptTimeout)
			url, err := discoverDataConnectHubURL(attemptCtx, cfg, logger)
			cancel()
			if err == nil {
				holder.Set(url)
				logger.Info("Data Connect Hub API URL discovered after retry", "url", url)
				return
			}
			if backoff < dchDiscoveryMaxBackoff {
				backoff *= 2
				if backoff > dchDiscoveryMaxBackoff {
					backoff = dchDiscoveryMaxBackoff
				}
			}
			logger.Warn("Data Connect Hub API URL discovery failed; will retry", "error", err, "retryIn", backoff)
		}
	}()
}
