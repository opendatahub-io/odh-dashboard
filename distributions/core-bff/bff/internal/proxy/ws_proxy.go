package proxy

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"net/url"

	"github.com/gorilla/websocket"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/httpcontract"
	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/ssrf"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// WssProxyPrefix is the URL path prefix for Kubernetes WebSocket proxy requests.
const WssProxyPrefix = constants.WssProxyPrefix

// WsProxyConfig holds the configuration for creating a WebSocket proxy handler.
type WsProxyConfig struct {
	// K8sHost is the Kubernetes API server URL.
	K8sHost string
	// RootCAs is the certificate pool for verifying the K8s API server's certificate.
	RootCAs *x509.CertPool
	// ClientCerts are client certificates presented on every upstream dial
	// (envtest mock mode, where impersonation headers carry the identity).
	ClientCerts []tls.Certificate
	// FallbackClientCerts are presented only on handshakes whose identity has
	// DevFallback set; see K8sProxyConfig.FallbackClientCerts.
	FallbackClientCerts []tls.Certificate
	// InsecureSkipVerify disables TLS certificate verification.
	InsecureSkipVerify bool
	// AllowHTTP permits insecure HTTP connections to the K8s API server.
	AllowHTTP bool
	// AllowedOrigins lists allowed WebSocket origins for CORS.
	AllowedOrigins []string
	// SSRFValidateTarget enables SSRF protection for target hostnames.
	SSRFValidateTarget bool
	// DevFallbackToken is the kubeconfig's bearer token used when the request identity
	// has DevFallback set. Empty means no token fallback (client cert auth handles it).
	DevFallbackToken string
	// Tracker is the connection tracker for managing active WebSocket connections.
	Tracker *ConnectionTracker
	// Logger is used for logging WebSocket operations.
	Logger *slog.Logger
}

type wsProxy struct {
	targetURL        *url.URL
	wsScheme         string
	tlsConfig        *tls.Config
	fallbackTLS      *tls.Config
	devFallbackToken string
	tracker          *ConnectionTracker
	logger           *slog.Logger
	upgrader         websocket.Upgrader
	netDialContext   func(ctx context.Context, network, addr string) (net.Conn, error)
}

func (p *wsProxy) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	httpcontract.EnsureID(w, r)
	identity, ok := r.Context().Value(constants.RequestIdentityKey).(*k8s.RequestIdentity)
	if !ok || identity == nil || (!identity.DevFallback && identity.ResolveToken(p.devFallbackToken) == "") {
		httpcontract.WriteLocal(w, r, http.StatusUnauthorized)
		return
	}

	if !websocket.IsWebSocketUpgrade(r) {
		httpcontract.WriteLocal(w, r, http.StatusBadRequest)
		return
	}

	if !p.upgrader.CheckOrigin(r) {
		httpcontract.WriteLocal(w, r, http.StatusForbidden)
		return
	}

	token := identity.ResolveToken(p.devFallbackToken)

	targetWSURL := buildTargetWSURL(p.wsScheme, p.targetURL.Host, p.targetURL, r)
	upstreamRequest := r.Clone(r.Context())
	upstreamRequest.URL.Path = kubernetesWebSocketPath(r)
	watch := httpcontract.IsWatchRequest(upstreamRequest)
	// A client-supplied bearer subprotocol is a credential, not a protocol to
	// negotiate: only the BFF's resolved token (added by dialK8sWebSocket) may
	// reach the API server, so the request never carries two identities.
	clientSubprotocols := withoutBearerSubprotocols(AllSubprotocols(r.Header))

	tlsConfig := p.tlsConfig
	if identity.DevFallback && p.fallbackTLS != nil {
		tlsConfig = p.fallbackTLS
	}
	targetConn, resp, dialErr := dialK8sWebSocket(targetWSURL, tlsConfig, token, p.targetURL, p.netDialContext, clientSubprotocols, httpcontract.RequestID(r.Context()))
	if dialErr != nil {
		p.handleDialError(w, r, resp, dialErr)
		return
	}

	httpcontract.CaptureAudit(r.Context(), resp.Header)
	clientConn, upgradeErr := p.upgradeClient(w, r, targetConn, clientSubprotocols)
	if upgradeErr != nil {
		httpcontract.Log(p.logger, r).Warn("WebSocket upgrade rejected", "code", "BAD_REQUEST")
		targetConn.Close()
		return
	}

	httpcontract.Log(p.logger, r).Info("WebSocket connected")
	diagnosticRequest := upstreamRequest.Clone(upstreamRequest.Context())
	if token != "" {
		// The redactor scrubs this token from relayed diagnostics.
		diagnosticRequest.Header.Set(constants.HeaderAuthorization, k8s.BearerTokenPrefix+token)
	}
	bridgeConnections(p.tracker, clientConn, targetConn, httpcontract.RequestID(r.Context()), watch, diagnosticRequest)
}

func (p *wsProxy) handleDialError(w http.ResponseWriter, r *http.Request, resp *http.Response, err error) {
	if resp != nil && resp.StatusCode >= http.StatusBadRequest {
		httpcontract.CaptureAudit(r.Context(), resp.Header)
		httpcontract.Log(p.logger, r).Warn("WebSocket handshake rejected", "status", resp.StatusCode)
		httpcontract.CopyRetryAfter(w.Header(), resp.Header)
		if resp.Body != nil {
			defer resp.Body.Close()
		}
		resp.Request = r
		// Idempotent normalization keeps this HTTP rejection boundary safe even
		// when handed a response directly rather than through the dial adapter.
		_ = httpcontract.KubernetesResponse(resp)
		var status metav1.Status
		_ = json.NewDecoder(resp.Body).Decode(&status)
		httpcontract.WriteProxyStatus(w, r, resp.StatusCode, status)
	} else {
		httpcontract.Log(p.logger, r).Error("WebSocket dial failed", "code", httpcontract.Classify(err, http.StatusBadGateway).Error.Code)
		if resp != nil && resp.Body != nil {
			_ = resp.Body.Close()
		}
		httpcontract.WriteError(w, r, err, http.StatusBadGateway)
	}
}

// NewWsProxyHandler creates an HTTP handler that relays WebSocket connections to the Kubernetes API server.
func NewWsProxyHandler(cfg WsProxyConfig) (http.Handler, error) {
	targetURL, err := url.Parse(cfg.K8sHost)
	if err != nil {
		return nil, fmt.Errorf("failed to parse K8s API server URL %q: %w", cfg.K8sHost, err)
	}

	if targetURL.Scheme == constants.SchemeHTTP && !cfg.AllowHTTP {
		return nil, fmt.Errorf("insecure HTTP target URLs are not allowed for WebSocket proxy")
	}

	wsScheme := constants.SchemeWSS
	if targetURL.Scheme == constants.SchemeHTTP {
		wsScheme = constants.SchemeWS
	}

	tlsConfig := NewTLSConfig(cfg.RootCAs, cfg.InsecureSkipVerify)
	tlsConfig.NextProtos = []string{constants.ALPNHTTP11}
	if len(cfg.ClientCerts) > 0 {
		tlsConfig.Certificates = cfg.ClientCerts
	}
	var fallbackTLS *tls.Config
	if len(cfg.FallbackClientCerts) > 0 {
		fallbackTLS = tlsConfig.Clone()
		fallbackTLS.Certificates = withFallbackCerts(cfg.ClientCerts, cfg.FallbackClientCerts)
	}

	var netDialContext func(ctx context.Context, network, addr string) (net.Conn, error)
	if cfg.SSRFValidateTarget {
		netDialContext = ssrf.SafeDialContext(cfg.Logger, targetURL.Hostname())
	}

	return &wsProxy{
		targetURL:        targetURL,
		wsScheme:         wsScheme,
		tlsConfig:        tlsConfig,
		fallbackTLS:      fallbackTLS,
		devFallbackToken: cfg.DevFallbackToken,
		tracker:          cfg.Tracker,
		logger:           cfg.Logger,
		upgrader:         newUpgrader(cfg.AllowedOrigins),
		netDialContext:   netDialContext,
	}, nil
}
