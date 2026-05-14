package kubernetes

import (
	"fmt"
	"log/slog"
	"net/http"
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
	originalURL := req.URL.String()
	forwarded, err := t.manager.ForwardURL(req.Context(), originalURL)
	if err != nil {
		return nil, fmt.Errorf("port-forward failed for %s: %w", originalURL, err)
	}

	if forwarded != originalURL {
		t.logger.Debug("port-forwarded pipeline request", "from", originalURL, "to", forwarded)
		parsed, err := req.URL.Parse(forwarded)
		if err != nil {
			return nil, fmt.Errorf("failed to parse forwarded URL %s: %w", forwarded, err)
		}
		req = req.Clone(req.Context())
		req.URL = parsed
	}

	return t.base.RoundTrip(req)
}
