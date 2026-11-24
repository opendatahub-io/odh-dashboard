package proxy

import (
	"context"
	"crypto/tls"
	"encoding/base64"
	"net"
	"net/http"
	"net/url"
	"slices"
	"strings"
	"time"

	"github.com/gorilla/websocket"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/httpcontract"
	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
)

const (
	bearerSubprotocolPrefix = "base64url.bearer.authorization.k8s.io." //nolint:gosec // G101: public Kubernetes protocol identifier.
	base64BinarySubprotocol = "base64.binary.k8s.io"
	wsConnectionTimeout     = 10 * time.Second
)

func newUpgrader(allowedOrigins []string) websocket.Upgrader {
	return websocket.Upgrader{
		CheckOrigin: originChecker(allowedOrigins),
		Error: func(w http.ResponseWriter, r *http.Request, status int, _ error) {
			w.Header().Set(constants.HeaderSecWebSocketVersion, constants.WebSocketVersion)
			httpcontract.WriteLocal(w, r, status)
		},
	}
}

func originChecker(allowedOrigins []string) func(*http.Request) bool {
	if len(allowedOrigins) == 0 {
		return sameOriginCheck
	}
	if slices.Contains(allowedOrigins, "*") {
		return func(r *http.Request) bool { return true }
	}
	// Origins compare case-insensitively, as the CORS middleware compares
	// them: scheme and host are case-insensitive, and browsers send them
	// lower-cased, so https://Dashboard.Example.com must match here too.
	allowed := make(map[string]bool, len(allowedOrigins))
	for _, o := range allowedOrigins {
		allowed[strings.ToLower(strings.TrimRight(o, "/"))] = true
	}
	return func(r *http.Request) bool {
		origin := r.Header.Get(constants.HeaderOrigin)
		if origin == "" {
			return false
		}
		return allowed[strings.ToLower(strings.TrimRight(origin, "/"))]
	}
}

// sameOriginCheck allows WebSocket upgrades only when the Origin header
// matches the request's Host. This is the default when ALLOWED_ORIGINS is
// unset, so WebSockets work out of the box without opening cross-origin access.
func sameOriginCheck(r *http.Request) bool {
	origin := r.Header.Get(constants.HeaderOrigin)
	if origin == "" {
		return false
	}
	u, err := url.Parse(origin)
	if err != nil {
		return false
	}
	return strings.EqualFold(u.Host, r.Host)
}

func kubernetesWebSocketPath(r *http.Request) string {
	return strings.TrimPrefix(r.URL.Path, strings.TrimSuffix(WssProxyPrefix, "/"))
}

// buildTargetWSURL keeps base, the configured API server URL's path, in front
// of the Kubernetes route. The URL is assembled from its parts rather than by
// string concatenation, so an escaped base such as /tenant%23blue is not
// mistaken for a fragment and an escaped segment stays one segment.
func buildTargetWSURL(wsScheme, host string, base *url.URL, r *http.Request) string {
	route := kubernetesWebSocketPath(r)
	rawRoute := strings.TrimPrefix(r.URL.EscapedPath(), strings.TrimSuffix(WssProxyPrefix, "/"))
	if decoded, err := url.PathUnescape(rawRoute); err != nil || decoded != route {
		rawRoute = (&url.URL{Path: route}).EscapedPath()
	}
	basePath, baseRaw := "", ""
	if base != nil {
		basePath, baseRaw = base.Path, base.EscapedPath()
	}
	target := url.URL{
		Scheme:   wsScheme,
		Host:     host,
		Path:     JoinBasePath(basePath, route),
		RawPath:  JoinBasePath(baseRaw, rawRoute),
		RawQuery: r.URL.RawQuery,
	}
	return target.String()
}

func dialK8sWebSocket(targetWSURL string, tlsConfig *tls.Config, token string, targetURL *url.URL, netDialContext func(ctx context.Context, network, addr string) (net.Conn, error), clientSubprotocols []string, requestID string) (*websocket.Conn, *http.Response, error) {
	subprotocols := make([]string, 0, len(clientSubprotocols)+1)
	// A DEV_MODE fallback on a certificate-only kubeconfig has no token: the
	// handshake then authenticates with the client certificate alone.
	if token != "" {
		subprotocols = append(subprotocols, bearerSubprotocol(token))
	}
	subprotocols = append(subprotocols, clientSubprotocols...)

	dialer := websocket.Dialer{
		TLSClientConfig:  tlsConfig,
		HandshakeTimeout: wsConnectionTimeout,
		Subprotocols:     subprotocols,
	}

	dialHeaders := http.Header{}
	dialHeaders.Set(constants.HeaderHost, targetURL.Host)
	dialHeaders.Set(constants.HeaderOrigin, targetURL.Scheme+"://"+targetURL.Host)
	if token != "" {
		dialHeaders.Set(constants.HeaderAuthorization, k8s.BearerTokenPrefix+token)
	}

	dialHeaders.Set(httpcontract.RequestIDHeader, requestID)
	return dialWithHandshakeResponse(&dialer, targetWSURL, dialHeaders, targetURL.Hostname(), netDialContext)
}

// AllSubprotocols returns every subprotocol offered across all
// Sec-WebSocket-Protocol lines. websocket.Subprotocols reads only the first
// line, so a credential on a second line would otherwise go unseen.
func AllSubprotocols(h http.Header) []string {
	var out []string
	for _, line := range h.Values("Sec-Websocket-Protocol") {
		for _, p := range strings.Split(line, ",") {
			if p = strings.TrimSpace(p); p != "" {
				out = append(out, p)
			}
		}
	}
	return out
}

// stripBearerSubprotocols rewrites the Sec-WebSocket-Protocol lines of h
// without Kubernetes bearer-token subprotocols, so a proxied upgrade carries
// only the identity the proxy resolved.
func stripBearerSubprotocols(h http.Header) {
	if len(h.Values("Sec-Websocket-Protocol")) == 0 {
		return
	}
	kept := withoutBearerSubprotocols(AllSubprotocols(h))
	h.Del("Sec-Websocket-Protocol")
	if len(kept) > 0 {
		h.Set("Sec-Websocket-Protocol", strings.Join(kept, ", "))
	}
}

// withoutBearerSubprotocols drops Kubernetes bearer-token subprotocols.
func withoutBearerSubprotocols(protocols []string) []string {
	out := make([]string, 0, len(protocols))
	for _, p := range protocols {
		if !strings.HasPrefix(strings.ToLower(p), bearerSubprotocolPrefix) {
			out = append(out, p)
		}
	}
	return out
}

// BearerSubprotocolToken returns the token a client carries in a Kubernetes
// bearer subprotocol (the only way a browser can send one on a WebSocket),
// and whether such a subprotocol was present. A present but undecodable one
// yields "" and true.
func BearerSubprotocolToken(r *http.Request) (string, bool) {
	for _, p := range AllSubprotocols(r.Header) {
		if !strings.HasPrefix(strings.ToLower(p), bearerSubprotocolPrefix) {
			continue
		}
		raw, err := base64.RawURLEncoding.DecodeString(p[len(bearerSubprotocolPrefix):])
		if err != nil {
			return "", true
		}
		return strings.TrimSpace(string(raw)), true
	}
	return "", false
}

func bearerSubprotocol(token string) string {
	return bearerSubprotocolPrefix + base64.RawURLEncoding.EncodeToString([]byte(token))
}

// clientUpgradeResponseHeader builds the response header map for the browser-facing
// WebSocket 101 response. The gorilla upgrader writes the 101 directly and does not
// include headers already queued on the ResponseWriter, so security-relevant headers
// must be supplied here explicitly. Unrelated queued headers (CSP, Set-Cookie, etc.)
// are deliberately excluded — matching OpenShift Console's approach (console#17376).
func clientUpgradeResponseHeader(targetConn *websocket.Conn, clientSubprotocols []string) http.Header {
	h := http.Header{}
	h.Set(constants.HeaderXContentTypeOptions, constants.XContentTypeOptionsNoSniff)

	sp := targetConn.Subprotocol()
	if strings.HasPrefix(strings.ToLower(sp), bearerSubprotocolPrefix) {
		return h
	}
	if sp != "" {
		for _, csp := range clientSubprotocols {
			if csp == sp {
				h.Set(constants.HeaderSecWebSocketProto, sp)
				break
			}
		}
	}
	return h
}

func (p *wsProxy) upgradeClient(w http.ResponseWriter, r *http.Request, targetConn *websocket.Conn, clientSubprotocols []string) (*websocket.Conn, error) {
	upgradeHeaders := clientUpgradeResponseHeader(targetConn, clientSubprotocols)
	upgradeHeaders.Set(httpcontract.RequestIDHeader, httpcontract.RequestID(r.Context()))
	if audit := httpcontract.AuditID(r.Context()); audit != "" {
		upgradeHeaders.Set(httpcontract.AuditIDHeader, audit)
	}
	return p.upgrader.Upgrade(w, r, upgradeHeaders)
}
