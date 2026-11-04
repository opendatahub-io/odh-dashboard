package repositories

import (
	"context"
	"log/slog"
	"net/url"

	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/maas"
)

func trustedMaaSContext(
	ctx context.Context,
	parsedURL *url.URL,
	resolver maas.GatewayHostResolver,
	logger *slog.Logger,
) context.Context {
	origin, ok := discoveredTrustedMaaSOrigin(ctx, parsedURL, resolver, logger)
	if !ok {
		return ctx
	}
	return maas.WithTrustedMaaSOrigin(ctx, origin)
}

func discoveredTrustedMaaSOrigin(
	ctx context.Context,
	parsedURL *url.URL,
	resolver maas.GatewayHostResolver,
	logger *slog.Logger,
) (maas.MaaSOrigin, bool) {
	if resolver == nil {
		return maas.MaaSOrigin{}, false
	}

	secretOrigin, err := maas.MaaSOriginFromURL(parsedURL)
	if err != nil {
		return maas.MaaSOrigin{}, false
	}
	discoveredOrigin, err := resolver.Resolve(ctx)
	if err != nil {
		if logger != nil {
			logger.Debug("MaaS gateway discovery unavailable; private MaaS destinations remain blocked", "error", err)
		}
		return maas.MaaSOrigin{}, false
	}
	if !secretOrigin.Equal(discoveredOrigin) {
		if logger != nil {
			logger.Debug("MaaS Secret origin does not match discovered gateway origin", "secret_host", secretOrigin.Host, "secret_port", secretOrigin.Port)
		}
		return maas.MaaSOrigin{}, false
	}
	return discoveredOrigin, true
}
