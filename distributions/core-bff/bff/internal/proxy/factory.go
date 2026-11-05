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
			pr.Out.URL.Path = cfg.PathRewriteFn(pr.In)
		}

		stripImpersonationHeaders(pr.Out.Header)
		stripConfiguredHeaders(pr.Out.Header, cfg.StripHeaders)
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
