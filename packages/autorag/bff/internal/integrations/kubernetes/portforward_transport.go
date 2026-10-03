package kubernetes

import (
	"fmt"
	"log/slog"
	"net/http"

	helper "github.com/opendatahub-io/autorag-library/bff/internal/helpers"
)

// PortForwardWrapTransport returns a WrapTransport function that rewrites
// cluster-internal URLs (*.svc.cluster.local) to localhost via SPDY tunnels.
// Used in dev mode only — production passes nil.
func PortForwardWrapTransport(pfm *PortForwardManager, logger *slog.Logger) func(http.RoundTripper) http.RoundTripper {
	return func(base http.RoundTripper) http.RoundTripper {
		return &portForwardRoundTripper{base: base, manager: pfm, logger: logger}
	}
}

type portForwardRoundTripper struct {
	base    http.RoundTripper
	manager *PortForwardManager
	logger  *slog.Logger
}

func (t *portForwardRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	ctx := req.Context()
	originalURL := req.URL.String()
	requestNamespace, _ := ctx.Value(RequestNamespaceKey).(string)
	forwarded, err := t.manager.ForwardURL(ctx, requestNamespace, originalURL)
	if err != nil {
		return nil, fmt.Errorf("port-forward failed for %s: %w", safeURLForLog(originalURL), err)
	}

	if forwarded != originalURL {
		t.logger.Debug("port-forwarded pipeline request", "from", safeURLForLog(originalURL), "to", safeURLForLog(forwarded))
		parsed, err := req.URL.Parse(forwarded)
		if err != nil {
			return nil, fmt.Errorf("failed to parse forwarded URL %s: %w", safeURLForLog(forwarded), err)
		}
		req = req.Clone(ctx)
		req.URL = parsed
	}

	return t.base.RoundTrip(req)
}

func safeURLForLog(rawURL string) string {
	return helper.SafeURLForLog(rawURL)
}
