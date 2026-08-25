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
	"time"

	"github.com/opendatahub-io/data-registry/bff/internal/constants"
)

// dataRegistryUpstreamResponseHeaderTimeout bounds how long the proxy waits for the upstream to
// start writing a response after the request has been sent, once dialing/TLS/idle timeouts
// (inherited from http.DefaultTransport) have already succeeded.
const dataRegistryUpstreamResponseHeaderTimeout = 60 * time.Second

// DataRegistryProxyConfig configures the catchall reverse proxy that forwards every request
// under the BFF's Data Registry prefix straight through to the upstream Data Registry API with
// no per-operation transformation logic — the BFF is a "dumb proxy" for this backend (see
// RHAI-366/RHAI-415 and packages/data-registry/AGENTS.md).
type DataRegistryProxyConfig struct {
	// TargetURL returns the current upstream Data Registry API base URL, or nil if none is
	// available. It is called on every request (not just once when this proxy is built) so a URL
	// discovered later — e.g. by the background ConfigMap discovery retry loop in
	// data_registry_discovery.go — takes effect immediately, without restarting the process. The
	// caller (api.DataRegistryReverseProxy) already checks readiness before ever invoking this
	// proxy's ServeHTTP, so a nil result here should not happen in practice; Rewrite guards for
	// it anyway (see below).
	TargetURL func() *url.URL
	// StripPrefix is removed from the incoming request path before it is forwarded upstream.
	// e.g. StripPrefix "/api" turns BFF path "/api/v1/{project}/config" into upstream path
	// "/v1/{project}/config", matching the vendored OpenAPI contract's own "/v1" root exactly
	// (see openapi/src/data-registry-api.yaml) — only the BFF-facing "/api" wrapper is removed.
	// Any base path present on TargetURL itself (e.g. "https://host/data-registry-api") is
	// preserved and prepended, not discarded.
	StripPrefix string
	// IncomingAuthTokenHeader is the header this BFF itself reads the caller's bearer token from
	// (config.EnvConfig.AuthTokenHeader — typically "x-forwarded-access-token" for ODH/RHOAI, or
	// "Authorization" for the BFF binary's built-in fallback). Whichever header is configured is
	// never forwarded verbatim to the upstream: only the rebuilt "Authorization: Bearer <token>"
	// from AuthHeaderFn is ever sent, the same as the caller-asserted identity headers below.
	IncomingAuthTokenHeader string
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
	// upstream must not be able to tie up proxy goroutines indefinitely); only TLSClientConfig and
	// ResponseHeaderTimeout are overridden below. NewTLSConfig also sets MinVersion, which a bare
	// tls.Config{} would omit. ResponseHeaderTimeout guards the remaining gap DefaultTransport
	// leaves open: an upstream that accepts the connection and then never writes response headers
	// would otherwise pin a proxy goroutine and client connection indefinitely.
	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.TLSClientConfig = NewTLSConfig(nil, cfg.InsecureSkipVerify)
	transport.ResponseHeaderTimeout = dataRegistryUpstreamResponseHeaderTimeout

	return &httputil.ReverseProxy{
		Rewrite: func(pr *httputil.ProxyRequest) {
			target := cfg.TargetURL()
			if target == nil {
				// See the TargetURL doc comment above: the caller already checked readiness, so
				// this is defense-in-depth against a race, not an expected path. Leaving pr.Out
				// untouched makes the outbound request relative, which fails fast in the
				// transport and is reported as 503 by ErrorHandler below — never sent anywhere.
				return
			}

			pr.SetURL(target)
			pr.Out.Host = target.Host
			// Preserve any base path already present on the target (e.g.
			// "https://host/data-registry-api") instead of discarding it: prepend it to the
			// stripped inbound path rather than replacing pr.Out.URL.Path outright.
			pr.Out.URL.Path = strings.TrimSuffix(target.Path, "/") + strings.TrimPrefix(pr.In.URL.Path, cfg.StripPrefix)
			pr.Out.URL.RawPath = ""

			pr.Out.Header.Del("Authorization")
			if cfg.IncomingAuthTokenHeader != "" {
				// http.Header keys are canonicalized, so this is case-insensitive regardless of
				// how the header was configured/named.
				pr.Out.Header.Del(cfg.IncomingAuthTokenHeader)
			}
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
