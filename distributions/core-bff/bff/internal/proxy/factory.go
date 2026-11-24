// Package proxy provides reverse proxy and WebSocket relay handlers for forwarding requests to the Kubernetes API server.
package proxy

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"errors"
	"fmt"
	"io"
	"log"
	"log/slog"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
	"time"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/httpcontract"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/ssrf"
)

// ProxyConfig holds the configuration for creating a reverse proxy.
type ProxyConfig struct {
	TargetURL            *url.URL
	RootCAs              *x509.CertPool
	ClientCerts          []tls.Certificate
	InsecureSkipVerify   bool
	AllowHTTP            bool
	DisableCompression   bool
	PathRewriteFn        func(*http.Request) string
	AuthHeaderFn         func(*http.Request) string
	SetOutboundHeadersFn func(*http.Request, http.Header)
	StripHeaders         []string
	SSRFValidateTarget   bool
	SSRFAllowedHosts     []string
	Logger               *slog.Logger
	ErrorHandler         func(http.ResponseWriter, *http.Request, error)
	ModifyResponse       func(*http.Response) error
}

func (cfg ProxyConfig) validate() error {
	if cfg.TargetURL == nil {
		return fmt.Errorf("target URL is required")
	}
	if cfg.TargetURL.Scheme == constants.SchemeHTTP && !cfg.AllowHTTP {
		return fmt.Errorf("insecure HTTP target URLs are not allowed")
	}
	if cfg.Logger == nil {
		return fmt.Errorf("logger is required")
	}
	return nil
}

func (cfg ProxyConfig) rewriteFunc() func(*httputil.ProxyRequest) {
	target := cfg.TargetURL
	return func(pr *httputil.ProxyRequest) {
		pr.SetURL(target)
		pr.Out.Host = target.Host

		if cfg.PathRewriteFn != nil {
			// The rewrite yields the upstream route; the target's own path is a
			// base it is mounted under, so it is kept in front. Both the decoded
			// and the escaped form are built, so an escaped base such as
			// /tenant%2Fblue stays one segment.
			route := cfg.PathRewriteFn(pr.In)
			pr.Out.URL.Path = JoinBasePath(target.Path, route)
			pr.Out.URL.RawPath = JoinBasePath(target.EscapedPath(), escapedRoute(cfg.PathRewriteFn, pr.In, route))
		}

		stripImpersonationHeaders(pr.Out.Header)
		stripConfiguredHeaders(pr.Out.Header, cfg.StripHeaders)
		// A client bearer subprotocol on a proxied upgrade is a second identity
		// next to the resolved one; it never reaches an upstream.
		stripBearerSubprotocols(pr.Out.Header)
		// Install trusted authentication after stripping caller-provided headers.
		rewriteAuthHeader(pr, cfg.AuthHeaderFn)
		// SetOutboundHeadersFn must run after stripImpersonationHeaders so that
		// mock-mode impersonation headers are not stripped immediately after being set.
		if cfg.SetOutboundHeadersFn != nil {
			cfg.SetOutboundHeadersFn(pr.In, pr.Out.Header)
		}

		pr.Out.URL.RawQuery = pr.In.URL.RawQuery
	}
}

// JoinBasePath puts route under base, the path of a configured target URL such
// as https://models.example/serving or a kubeconfig server behind a path
// prefix. An empty or "/" base leaves route unchanged.
func JoinBasePath(base, route string) string {
	base = strings.TrimSuffix(base, "/")
	if base == "" {
		return route
	}
	if route == "" {
		return base
	}
	if !strings.HasPrefix(route, "/") {
		route = "/" + route
	}
	return base + route
}

// escapedRoute is the escaped form of route. The rewrite functions trim or
// prepend constant ASCII prefixes, so applying one to the request's escaped
// path yields the escaped route; that is used only when it decodes back to
// route, and otherwise route is escaped afresh.
func escapedRoute(rewrite func(*http.Request) string, in *http.Request, route string) string {
	clone := *in
	u := *in.URL
	u.Path = in.URL.EscapedPath()
	u.RawPath = ""
	clone.URL = &u
	if raw := rewrite(&clone); raw != "" {
		if decoded, err := url.PathUnescape(raw); err == nil && decoded == route {
			return raw
		}
	}
	return (&url.URL{Path: route}).EscapedPath()
}

func rewriteAuthHeader(pr *httputil.ProxyRequest, authHeaderFn func(*http.Request) string) {
	pr.Out.Header.Del(constants.HeaderAuthorization)
	if authHeaderFn != nil {
		if authValue := authHeaderFn(pr.In); authValue != "" {
			pr.Out.Header.Set(constants.HeaderAuthorization, authValue)
		}
	}
}

func stripImpersonationHeaders(h http.Header) {
	h.Del(constants.HeaderImpersonateUser)
	h.Del(constants.HeaderImpersonateGroup)
	for key := range h {
		if strings.HasPrefix(strings.ToLower(key), "impersonate-extra-") {
			h.Del(key)
		}
	}
}

func stripConfiguredHeaders(h http.Header, headers []string) {
	for _, name := range headers {
		h.Del(name)
	}
}

func (cfg ProxyConfig) errorHandler() func(http.ResponseWriter, *http.Request, error) {
	if cfg.ErrorHandler != nil {
		return cfg.ErrorHandler
	}
	return func(w http.ResponseWriter, r *http.Request, err error) {
		httpcontract.EnsureID(w, r)
		if errors.Is(err, context.Canceled) || errors.Is(r.Context().Err(), context.Canceled) {
			httpcontract.Log(cfg.Logger, r).Debug("proxy canceled", "code", "CANCELED")
			panic(http.ErrAbortHandler)
		}
		if errors.Is(err, ssrf.ErrSSRFBlocked) {
			httpcontract.Log(cfg.Logger, r).Warn("proxy policy rejection", "code", "FORBIDDEN")
			httpcontract.WriteLocal(w, r, http.StatusForbidden)
			return
		}
		httpcontract.Log(cfg.Logger, r).Error("proxy failed", "code", httpcontract.Classify(err, http.StatusBadGateway).Error.Code)
		httpcontract.WriteError(w, r, err, http.StatusBadGateway)
	}
}

// NewReverseProxy creates a configured httputil.ReverseProxy from the given config.
func NewReverseProxy(cfg ProxyConfig) (*httputil.ReverseProxy, error) {
	if err := cfg.validate(); err != nil {
		return nil, err
	}

	tlsConfig := NewTLSConfig(cfg.RootCAs, cfg.InsecureSkipVerify)
	if len(cfg.ClientCerts) > 0 {
		tlsConfig.Certificates = cfg.ClientCerts
	}

	dialer := &net.Dialer{
		Timeout:   30 * time.Second,
		KeepAlive: 30 * time.Second,
	}
	transport := &http.Transport{
		DisableCompression:    cfg.DisableCompression,
		TLSClientConfig:       tlsConfig,
		DialContext:           dialer.DialContext,
		TLSHandshakeTimeout:   10 * time.Second,
		ResponseHeaderTimeout: 30 * time.Second,
		IdleConnTimeout:       90 * time.Second,
		ExpectContinueTimeout: 1 * time.Second,
		MaxIdleConnsPerHost:   25,
	}
	if cfg.SSRFValidateTarget {
		transport.DialContext = ssrf.SafeDialContext(cfg.Logger, cfg.SSRFAllowedHosts...)
	}

	// http.Transport does not follow redirects; the upstream response is returned as-is
	proxy := &httputil.ReverseProxy{
		Rewrite:        cfg.rewriteFunc(),
		Transport:      httpcontract.Transport{Base: transport, Logger: cfg.Logger},
		ErrorLog:       log.New(io.Discard, "", 0),
		ErrorHandler:   cfg.errorHandler(),
		ModifyResponse: cfg.ModifyResponse,
	}

	return proxy, nil
}

// NewTLSConfig creates a TLS configuration with a minimum version of TLS 1.2.
func NewTLSConfig(rootCAs *x509.CertPool, insecureSkipVerify bool) *tls.Config {
	return &tls.Config{
		MinVersion:         tls.VersionTLS12,
		RootCAs:            rootCAs,
		InsecureSkipVerify: insecureSkipVerify, //nolint:gosec // G402: controlled by CLI flag, dev-only
	}
}
