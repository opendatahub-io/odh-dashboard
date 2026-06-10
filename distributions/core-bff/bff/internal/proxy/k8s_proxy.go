package proxy

import (
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"strings"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/ssrf"
)

// K8sProxyPrefix is the URL path prefix for Kubernetes API proxy requests.
const K8sProxyPrefix = "/api/k8s/"

// sensitiveIngressHeaders returns header names that must not leak from the ingress
// layer to the K8s API server. authTokenHeader is included dynamically because it
// is configurable (default: x-forwarded-access-token).
func sensitiveIngressHeaders(authTokenHeader string) []string {
	headers := []string{
		"cookie",
		"x-forwarded-for",
		"x-forwarded-host",
		"x-forwarded-port",
		"x-forwarded-proto",
		"x-forwarded-scheme",
		"x-forwarded-email",
		"x-forwarded-user",
		"x-forwarded-preferred-username",
		"x-forwarded-groups",
		"x-real-ip",
		"forwarded",
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
		TargetURL:            targetURL,
		RootCAs:              cfg.RootCAs,
		ClientCerts:          cfg.ClientCerts,
		InsecureSkipVerify:   cfg.InsecureSkipVerify,
		AllowHTTP:            cfg.AllowHTTP,
		SetOutboundHeadersFn: cfg.SetOutboundHeadersFn,
		StripHeaders:         sensitiveIngressHeaders(cfg.AuthTokenHeader),
		SSRFValidateTarget:   cfg.SSRFValidateTarget,
		SSRFAllowedHosts:     []string{targetURL.Hostname()},
		Logger:               cfg.Logger,
		PathRewriteFn: func(r *http.Request) string {
			return strings.TrimPrefix(r.URL.Path, strings.TrimSuffix(K8sProxyPrefix, "/"))
		},
		AuthHeaderFn: func(r *http.Request) string {
			identity, ok := r.Context().Value(constants.RequestIdentityKey).(*k8s.RequestIdentity)
			if !ok || identity == nil {
				return ""
			}
			return "Bearer " + identity.Token.Raw()
		},
		ModifyResponse: ssrf.NewRedirectValidator(cfg.Logger),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create K8s reverse proxy: %w", err)
	}

	return proxy, nil
}
