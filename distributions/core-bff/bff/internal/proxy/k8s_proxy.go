package proxy

import (
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"log/slog"
	"mime"
	"net/http"
	"net/url"
	"strings"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/httpcontract"
	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/ssrf"
)

// K8sProxyPrefix is the URL path prefix for Kubernetes API proxy requests.
const K8sProxyPrefix = constants.K8sProxyPrefix

// SensitiveIngressHeaders returns header names that must not leak from the ingress
// layer to upstream services. authTokenHeader is included dynamically because it
// is configurable (default: x-forwarded-access-token).
func SensitiveIngressHeaders(authTokenHeader string) []string {
	headers := []string{
		constants.HeaderCookie,
		constants.HeaderXForwardedFor,
		constants.HeaderXForwardedHost,
		constants.HeaderXForwardedPort,
		constants.HeaderXForwardedProto,
		constants.HeaderXForwardedScheme,
		constants.HeaderXForwardedEmail,
		constants.HeaderXForwardedUser,
		constants.HeaderXForwardedPreferredUsername,
		constants.HeaderXForwardedGroups,
		constants.HeaderXRealIP,
		constants.HeaderForwarded,
	}
	if authTokenHeader != "" {
		headers = append(headers, authTokenHeader)
	}
	return headers
}

// K8sProxyConfig holds the configuration for creating a K8s API proxy handler.
type K8sProxyConfig struct {
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
	// AuthTokenHeader is the header name containing the user's token.
	AuthTokenHeader string
	// SetOutboundHeadersFn customizes headers on outbound requests.
	SetOutboundHeadersFn func(*http.Request, http.Header)
	// SSRFValidateTarget enables SSRF protection for dial-time DNS resolution.
	// The configured K8s host is automatically allowlisted so private-IP blocking
	// does not reject the proxy's own target.
	SSRFValidateTarget bool
	// DevFallbackToken is the kubeconfig's bearer token used when the request identity
	// has DevFallback set. Empty means no token fallback (client cert auth handles it).
	DevFallbackToken string
	// Logger is used for logging proxy operations.
	Logger *slog.Logger
}

// NewK8sProxyHandler creates an HTTP handler that proxies requests to the Kubernetes API server.
func NewK8sProxyHandler(cfg K8sProxyConfig) (http.Handler, error) {
	if cfg.K8sHost == "" {
		return nil, fmt.Errorf("K8sHost must be a non-empty absolute http/https URL")
	}
	targetURL, err := url.Parse(cfg.K8sHost)
	if err != nil {
		return nil, fmt.Errorf("failed to parse K8s API server URL %q: %w", cfg.K8sHost, err)
	}
	if (targetURL.Scheme != "http" && targetURL.Scheme != "https") || targetURL.Host == "" {
		return nil, fmt.Errorf("K8sHost must be an absolute http/https URL, got %q", cfg.K8sHost)
	}

	proxy, err := NewReverseProxy(ProxyConfig{
		TargetURL:          targetURL,
		RootCAs:            cfg.RootCAs,
		ClientCerts:        cfg.ClientCerts,
		InsecureSkipVerify: cfg.InsecureSkipVerify,
		AllowHTTP:          cfg.AllowHTTP,
		// Keep compressed error bytes visible to the bounded Status decoder.
		DisableCompression: true,
		SetOutboundHeadersFn: func(in *http.Request, out http.Header) {
			if cfg.SetOutboundHeadersFn != nil {
				cfg.SetOutboundHeadersFn(in, out)
			}
			out.Del(constants.HeaderConnection)
			out.Del(constants.HeaderUpgrade)
			if httpcontract.IsWatchRequest(in) {
				out.Set(constants.HeaderAccept, jsonWatchAccept(out.Values(constants.HeaderAccept)))
				// Watch decoding is handled explicitly before event sanitization.
				out.Set(constants.HeaderAcceptEncoding, constants.ContentEncodingGzip)
			}
		},
		StripHeaders:       SensitiveIngressHeaders(cfg.AuthTokenHeader),
		SSRFValidateTarget: cfg.SSRFValidateTarget,
		SSRFAllowedHosts:   []string{targetURL.Hostname()},
		Logger:             cfg.Logger,
		PathRewriteFn: func(r *http.Request) string {
			return strings.TrimPrefix(r.URL.Path, strings.TrimSuffix(K8sProxyPrefix, "/"))
		},
		AuthHeaderFn: func(r *http.Request) string {
			identity, ok := r.Context().Value(constants.RequestIdentityKey).(*k8s.RequestIdentity)
			if !ok || identity == nil {
				return ""
			}
			return k8s.BearerTokenPrefix + identity.ResolveToken(cfg.DevFallbackToken)
		},
		ModifyResponse: func(resp *http.Response) error {
			if resp.StatusCode == http.StatusSwitchingProtocols {
				return fmt.Errorf("protocol upgrades require the Kubernetes WebSocket endpoint")
			}
			if err := ssrf.NewRedirectValidator(cfg.Logger)(resp); err != nil {
				return err
			}
			if resp.StatusCode >= http.StatusBadRequest {
				resp.Header.Del(cfg.AuthTokenHeader)
			}
			return httpcontract.KubernetesResponse(resp)
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create K8s reverse proxy: %w", err)
	}

	return proxy, nil
}

// jsonWatchAccept keeps JSON representations and their parameters while excluding binary encodings.
func jsonWatchAccept(values []string) string {
	var entries []string
	for _, value := range values {
		start := 0
		quoted, escaped := false, false
		// Quoted parameters may contain commas; the appended comma flushes the final entry.
		for i, c := range value + "," {
			switch {
			case escaped:
				escaped = false
			case quoted && c == '\\':
				escaped = true
			case c == '"':
				quoted = !quoted
			case c == ',' && !quoted:
				entry := strings.TrimSpace(value[start:i])
				mediaType, _, err := mime.ParseMediaType(entry)
				if err == nil && mediaType == constants.ContentTypeJSON {
					entries = append(entries, entry)
				}
				start = i + 1
			}
		}
	}
	if len(entries) == 0 {
		return constants.ContentTypeJSON
	}
	return strings.Join(entries, ",")
}
