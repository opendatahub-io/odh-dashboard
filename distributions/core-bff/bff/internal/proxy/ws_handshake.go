package proxy

import (
	"context"
	"crypto/tls"
	"encoding/base64"
	"fmt"
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
	allowed := make(map[string]bool, len(allowedOrigins))
	for _, o := range allowedOrigins {
		allowed[strings.TrimRight(o, "/")] = true
	}
	return func(r *http.Request) bool {
		origin := r.Header.Get(constants.HeaderOrigin)
		if origin == "" {
			return false
		}
		return allowed[strings.TrimRight(origin, "/")]
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

func buildTargetWSURL(wsScheme, host string, r *http.Request) string {
	kubeURI := kubernetesWebSocketPath(r)
	targetWSURL := fmt.Sprintf("%s://%s%s", wsScheme, host, kubeURI)
	if r.URL.RawQuery != "" {
		targetWSURL += "?" + r.URL.RawQuery
	}
	return targetWSURL
}

func dialK8sWebSocket(targetWSURL string, tlsConfig *tls.Config, token string, targetURL *url.URL, netDialContext func(ctx context.Context, network, addr string) (net.Conn, error), clientSubprotocols []string, requestID string) (*websocket.Conn, *http.Response, error) {
	subprotocols := make([]string, 0, len(clientSubprotocols)+1)
	subprotocols = append(subprotocols, bearerSubprotocol(token))
	subprotocols = append(subprotocols, clientSubprotocols...)

	dialer := websocket.Dialer{
		TLSClientConfig:  tlsConfig,
		HandshakeTimeout: wsConnectionTimeout,
		Subprotocols:     subprotocols,
	}

	dialHeaders := http.Header{}
	dialHeaders.Set(constants.HeaderHost, targetURL.Host)
	dialHeaders.Set(constants.HeaderOrigin, targetURL.Scheme+"://"+targetURL.Host)
	dialHeaders.Set(constants.HeaderAuthorization, k8s.BearerTokenPrefix+token)

	dialHeaders.Set(httpcontract.RequestIDHeader, requestID)
	return dialWithHandshakeResponse(&dialer, targetWSURL, dialHeaders, targetURL.Hostname(), netDialContext)
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
