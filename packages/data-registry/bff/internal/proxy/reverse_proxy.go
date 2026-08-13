// Package proxy also provides the catchall HTTP reverse proxy used to forward Data Registry
// API traffic upstream (see DataRegistryProxyConfig / NewDataRegistryReverseProxy below), in
// addition to the WebSocket relay and TLS helpers already in this package.
package proxy

import (
	"log/slog"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"

	"github.com/opendatahub-io/data-registry/bff/internal/constants"
)

// DataRegistryProxyConfig configures the catchall reverse proxy that forwards every request
// under the BFF's Data Registry prefix straight through to the upstream Data Registry API with
// no per-operation transformation logic — the BFF is a "dumb proxy" for this backend (see
// RHAI-366/RHAI-415 and packages/data-registry/AGENTS.md).
type DataRegistryProxyConfig struct {
	// TargetURL is the upstream Data Registry API base URL.
	TargetURL *url.URL
	// StripPrefix is removed from the incoming request path before it is forwarded upstream.
	// e.g. StripPrefix "/api" turns BFF path "/api/v1/{project}/config" into upstream path
	// "/v1/{project}/config", matching the vendored OpenAPI contract's own "/v1" root exactly
	// (see openapi/src/data-registry-api.yaml) — only the BFF-facing "/api" wrapper is removed.
	StripPrefix string
	// AuthHeaderFn returns the "Authorization" header value to send upstream. The incoming
	// request's own Authorization header is always discarded first: the value sent upstream is
	// rebuilt from the caller's verified identity, never copied verbatim. Other caller-asserted
	// identity headers the upstream trusts (X-User, kubeflow-userid, kubeflow-groups) are always
	// stripped outright — see NewDataRegistryReverseProxy.
	AuthHeaderFn func(*http.Request) string
	// InsecureSkipVerify skips upstream TLS certificate verification (dev only).
	InsecureSkipVerify bool
	Logger             *slog.Logger
}

// NewDataRegistryReverseProxy builds an httputil.ReverseProxy that forwards every request
// (method, body, and headers minus Authorization and caller-asserted identity headers) verbatim
// to cfg.TargetURL, rewriting only the path prefix, the Authorization header, and stripping
// those identity headers. Errors reaching the upstream are reported as 503 with a JSON payload;
// callers that want the BFF's own error-response envelope end-to-end (e.g. for the "unconfigured
// upstream" case) should still wrap the returned proxy (see api.DataRegistryReverseProxy).
func NewDataRegistryReverseProxy(cfg DataRegistryProxyConfig) *httputil.ReverseProxy {
	// Clone http.DefaultTransport rather than starting from a zero-value http.Transport, so the
	// upstream dial/TLS-handshake/idle-connection timeouts stay bounded (a hung or slow-TLS
	// upstream must not be able to tie up proxy goroutines indefinitely); only TLSClientConfig is
	// overridden below. NewTLSConfig also sets MinVersion, which a bare tls.Config{} would omit.
	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.TLSClientConfig = NewTLSConfig(nil, cfg.InsecureSkipVerify)

	return &httputil.ReverseProxy{
		Rewrite: func(pr *httputil.ProxyRequest) {
			pr.SetURL(cfg.TargetURL)
			pr.Out.Host = cfg.TargetURL.Host
			pr.Out.URL.Path = strings.TrimPrefix(pr.In.URL.Path, cfg.StripPrefix)
			pr.Out.URL.RawPath = ""

			pr.Out.Header.Del("Authorization")
			if cfg.AuthHeaderFn != nil {
				if v := cfg.AuthHeaderFn(pr.In); v != "" {
					pr.Out.Header.Set("Authorization", v)
				}
			}

			// The upstream Data Registry API trusts these headers for user attribution (e.g. the
			// `registered_by` field on registered assets). As with Authorization above, a
			// caller-supplied value must never be forwarded verbatim — only the BFF's own
			// verified identity may assert who the caller is.
			pr.Out.Header.Del(constants.XUserHeader)
			pr.Out.Header.Del(constants.KubeflowUserIDHeader)
			pr.Out.Header.Del(constants.KubeflowUserGroupsIdHeader)
		},
		Transport: transport,
		ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
			if cfg.Logger != nil {
				cfg.Logger.Error("data registry proxy error", slog.Any("error", err), slog.String("path", r.URL.Path))
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusServiceUnavailable)
			_, _ = w.Write([]byte(`{"error":{"code":"503","message":"the upstream service is unavailable"}}`))
		},
	}
}
