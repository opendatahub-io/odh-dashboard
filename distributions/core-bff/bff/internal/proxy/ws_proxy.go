package proxy

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/base64"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"slices"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/ssrf"
)

const (
	// WssProxyPrefix is the URL path prefix for Kubernetes WebSocket proxy requests.
	WssProxyPrefix = "/wss/k8s/"

	wsConnectionTimeout = 10 * time.Second
	wsHeartbeatInterval = 15 * time.Second
)

func newUpgrader(allowedOrigins []string) websocket.Upgrader {
	return websocket.Upgrader{
		CheckOrigin: originChecker(allowedOrigins),
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
		origin := r.Header.Get("Origin")
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
	origin := r.Header.Get("Origin")
	if origin == "" {
		return false
	}
	u, err := url.Parse(origin)
	if err != nil {
		return false
	}
	return strings.EqualFold(u.Host, r.Host)
}

func buildTargetWSURL(wsScheme, host string, r *http.Request) string {
	kubeURI := strings.TrimPrefix(r.URL.Path, strings.TrimSuffix(WssProxyPrefix, "/"))
	targetWSURL := fmt.Sprintf("%s://%s%s", wsScheme, host, kubeURI)
	if r.URL.RawQuery != "" {
		targetWSURL += "?" + r.URL.RawQuery
	}
	return targetWSURL
}

func closeCodeFromError(err error) int {
	var ce *websocket.CloseError
	if errors.As(err, &ce) {
		return sanitizeCloseCode(ce.Code)
	}
	return sanitizeCloseCode(websocket.CloseInternalServerErr)
}

const writeControlTimeout = 5 * time.Second

func sendCloseMessage(conn *websocket.Conn, err error) {
	_ = conn.WriteControl(websocket.CloseMessage,
		websocket.FormatCloseMessage(closeCodeFromError(err), ""),
		time.Now().Add(writeControlTimeout))
}

func forwardTargetToClient(tracker *ConnectionTracker, connID string, target, client *websocket.Conn, cleanup func()) {
	defer cleanup()
	for {
		msgType, msg, err := target.ReadMessage()
		if err != nil {
			sendCloseMessage(client, err)
			return
		}
		tracker.updateMetricsReceived(connID)
		trackBookmark(tracker, connID, msg)
		if writeErr := client.WriteMessage(msgType, msg); writeErr != nil {
			return
		}
		tracker.updateMetricsSent(connID)
	}
}

func forwardClientToTarget(tracker *ConnectionTracker, connID string, client, target *websocket.Conn, cleanup func()) {
	defer cleanup()
	for {
		msgType, msg, err := client.ReadMessage()
		if err != nil {
			sendCloseMessage(target, err)
			return
		}
		tracker.updateMetricsReceived(connID)
		if writeErr := target.WriteMessage(msgType, msg); writeErr != nil {
			return
		}
		tracker.updateMetricsSent(connID)
	}
}

func runHeartbeat(tracker *ConnectionTracker, connID string, target *websocket.Conn, heartbeat *time.Ticker, done <-chan struct{}, cleanup func()) {
	for {
		select {
		case <-done:
			return
		case <-heartbeat.C:
			if err := target.WriteControl(websocket.PingMessage, nil, time.Now().Add(writeControlTimeout)); err != nil {
				cleanup()
				return
			}
			tracker.updatePingSuccess(connID)
		}
	}
}

func dialK8sWebSocket(targetWSURL string, tlsConfig *tls.Config, token string, targetURL *url.URL, netDialContext func(ctx context.Context, network, addr string) (net.Conn, error), clientSubprotocols []string) (*websocket.Conn, *http.Response, error) {
	subprotocols := make([]string, 0, len(clientSubprotocols)+1)
	subprotocols = append(subprotocols, bearerSubprotocol(token))
	subprotocols = append(subprotocols, clientSubprotocols...)

	dialer := websocket.Dialer{
		TLSClientConfig:  tlsConfig,
		HandshakeTimeout: wsConnectionTimeout,
		NetDialContext:   netDialContext,
		Subprotocols:     subprotocols,
	}

	dialHeaders := http.Header{}
	dialHeaders.Set("Host", targetURL.Host)
	dialHeaders.Set("Origin", targetURL.Scheme+"://"+targetURL.Host)
	dialHeaders.Set("Authorization", "Bearer "+token)

	return dialer.Dial(targetWSURL, dialHeaders)
}

func bearerSubprotocol(token string) string {
	return "base64url.bearer.authorization.k8s.io." + base64.RawURLEncoding.EncodeToString([]byte(token))
}

func negotiatedSubprotocolHeader(targetConn *websocket.Conn, clientSubprotocols []string) http.Header {
	sp := targetConn.Subprotocol()
	if sp == "" {
		return nil
	}
	for _, csp := range clientSubprotocols {
		if csp == sp {
			h := http.Header{}
			h.Set("Sec-WebSocket-Protocol", sp)
			return h
		}
	}
	return nil
}

func bridgeConnections(tracker *ConnectionTracker, clientConn, targetConn *websocket.Conn) {
	connID := tracker.Track(clientConn, targetConn)
	heartbeat := time.NewTicker(wsHeartbeatInterval)
	done := make(chan struct{})
	var closeOnce sync.Once
	cleanup := func() {
		closeOnce.Do(func() {
			close(done)
			heartbeat.Stop()
			tracker.Untrack(connID)
			clientConn.Close()
			targetConn.Close()
		})
	}

	go forwardTargetToClient(tracker, connID, targetConn, clientConn, cleanup)
	go forwardClientToTarget(tracker, connID, clientConn, targetConn, cleanup)
	go runHeartbeat(tracker, connID, targetConn, heartbeat, done, cleanup)
}

func sanitizeCloseCode(code int) int {
	switch code {
	case 1004, 1005, 1006:
		return 1011
	default:
		return code
	}
}

// WsProxyConfig holds the configuration for creating a WebSocket proxy handler.
type WsProxyConfig struct {
	// K8sHost is the Kubernetes API server URL.
	K8sHost string
	// RootCAs is the certificate pool for verifying the K8s API server's certificate.
	RootCAs *x509.CertPool
	// ClientCerts are client certificates for mTLS authentication.
	ClientCerts []tls.Certificate
	// InsecureSkipVerify disables TLS certificate verification.
	InsecureSkipVerify bool
	// AllowHTTP permits insecure HTTP connections to the K8s API server.
	AllowHTTP bool
	// AllowedOrigins lists allowed WebSocket origins for CORS.
	AllowedOrigins []string
	// SSRFValidateTarget enables SSRF protection for target hostnames.
	SSRFValidateTarget bool
	// Tracker is the connection tracker for managing active WebSocket connections.
	Tracker *ConnectionTracker
	// Logger is used for logging WebSocket operations.
	Logger *slog.Logger
}

type wsProxy struct {
	targetURL      *url.URL
	wsScheme       string
	tlsConfig      *tls.Config
	tracker        *ConnectionTracker
	logger         *slog.Logger
	upgrader       websocket.Upgrader
	netDialContext func(ctx context.Context, network, addr string) (net.Conn, error)
}

func (p *wsProxy) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	identity, ok := r.Context().Value(constants.RequestIdentityKey).(*k8s.RequestIdentity)
	if !ok || identity == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if !websocket.IsWebSocketUpgrade(r) {
		http.Error(w, "WebSocket upgrade required", http.StatusBadRequest)
		return
	}

	if !p.upgrader.CheckOrigin(r) {
		http.Error(w, "origin not allowed", http.StatusForbidden)
		return
	}

	targetWSURL := buildTargetWSURL(p.wsScheme, p.targetURL.Host, r)
	clientSubprotocols := websocket.Subprotocols(r)

	targetConn, resp, dialErr := dialK8sWebSocket(targetWSURL, p.tlsConfig, identity.Token.Raw(), p.targetURL, p.netDialContext, clientSubprotocols)
	if dialErr != nil {
		p.logDialError(targetWSURL, dialErr, resp)
		http.Error(w, "upstream connection failed", http.StatusBadGateway)
		return
	}

	clientConn, upgradeErr := p.upgrader.Upgrade(w, r, negotiatedSubprotocolHeader(targetConn, clientSubprotocols))
	if upgradeErr != nil {
		p.logger.Error("WebSocket upgrade failed", slog.Any("error", upgradeErr))
		targetConn.Close()
		return
	}

	bridgeConnections(p.tracker, clientConn, targetConn)
}

func (p *wsProxy) logDialError(target string, err error, resp *http.Response) {
	attrs := []any{slog.String("target", target), slog.Any("error", err)}
	if resp != nil {
		attrs = append(attrs, slog.Int("status", resp.StatusCode))
	}
	p.logger.Error("WebSocket dial failed", attrs...)
}

// NewWsProxyHandler creates an HTTP handler that relays WebSocket connections to the Kubernetes API server.
func NewWsProxyHandler(cfg WsProxyConfig) (http.Handler, error) {
	targetURL, err := url.Parse(cfg.K8sHost)
	if err != nil {
		return nil, fmt.Errorf("failed to parse K8s API server URL %q: %w", cfg.K8sHost, err)
	}

	if targetURL.Scheme == "http" && !cfg.AllowHTTP {
		return nil, fmt.Errorf("insecure HTTP target URLs are not allowed for WebSocket proxy")
	}

	wsScheme := "wss"
	if targetURL.Scheme == "http" {
		wsScheme = "ws"
	}

	tlsConfig := NewTLSConfig(cfg.RootCAs, cfg.InsecureSkipVerify)
	tlsConfig.NextProtos = []string{"http/1.1"}
	if len(cfg.ClientCerts) > 0 {
		tlsConfig.Certificates = cfg.ClientCerts
	}

	var netDialContext func(ctx context.Context, network, addr string) (net.Conn, error)
	if cfg.SSRFValidateTarget {
		netDialContext = ssrf.SafeDialContext(cfg.Logger, targetURL.Hostname())
	}

	return &wsProxy{
		targetURL:      targetURL,
		wsScheme:       wsScheme,
		tlsConfig:      tlsConfig,
		tracker:        cfg.Tracker,
		logger:         cfg.Logger,
		upgrader:       newUpgrader(cfg.AllowedOrigins),
		netDialContext: netDialContext,
	}, nil
}
