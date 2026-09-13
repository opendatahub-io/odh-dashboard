package maas

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/opendatahub-io/autorag-library/bff/internal/models"
)

type httpClientInterface interface {
	Do(req *http.Request) (*http.Response, error)
}

type MaaSClientInterface interface {
	ListModels(ctx context.Context, baseURL, apiKey string) ([]models.MaaSNativeModel, error)
}

type MaaSClient struct {
	httpClient httpClientInterface
}

type MaaSClientConfig struct {
	InsecureSkipVerify bool
	RootCAs            *x509.CertPool
	WrapTransport      func(http.RoundTripper) http.RoundTripper
	LookupIP           func(context.Context, string) ([]net.IP, error)
}

func NewMaaSClient(httpClient httpClientInterface) *MaaSClient {
	return &MaaSClient{httpClient: httpClient}
}

func NewDefaultMaaSClient(cfg MaaSClientConfig) *MaaSClient {
	tlsConfig := &tls.Config{
		InsecureSkipVerify: cfg.InsecureSkipVerify, //nolint:gosec // controlled by development-only config
		MinVersion:         tls.VersionTLS13,
		RootCAs:            cfg.RootCAs,
	}
	lookupIP := cfg.LookupIP
	if lookupIP == nil {
		lookupIP = func(ctx context.Context, host string) ([]net.IP, error) {
			return net.DefaultResolver.LookupIP(ctx, "ip", host)
		}
	}
	dialer := &net.Dialer{}
	transport := &http.Transport{
		TLSClientConfig: tlsConfig,
		DialContext:     maaSSafeDialContext(dialer.DialContext, lookupIP),
	}
	var rt http.RoundTripper = transport
	if cfg.WrapTransport != nil {
		rt = cfg.WrapTransport(rt)
	}
	return NewMaaSClient(&http.Client{
		Transport: rt,
		CheckRedirect: func(_ *http.Request, _ []*http.Request) error {
			return http.ErrUseLastResponse
		},
	})
}

func (c *MaaSClient) ListModels(ctx context.Context, baseURL, apiKey string) ([]models.MaaSNativeModel, error) {
	endpoint, err := buildModelsURL(baseURL)
	if err != nil {
		return nil, NewMaaSError(ErrCodeInvalidRequest, err.Error(), http.StatusBadRequest)
	}

	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, NewMaaSError(ErrCodeInvalidRequest, "failed to create MaaS request", http.StatusBadRequest)
	}
	req.Header.Set("Accept", "application/json")
	setAuthHeader(req, apiKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, wrapMaaSClientError(err)
	}
	defer resp.Body.Close()

	const maxResponseBytes = 2 << 20
	body, err := io.ReadAll(io.LimitReader(resp.Body, maxResponseBytes))
	if err != nil {
		return nil, NewMaaSError(ErrCodeInternalError, "failed to read MaaS response", http.StatusBadGateway)
	}
	if resp.StatusCode != http.StatusOK {
		return nil, mapHTTPStatusToError(resp.StatusCode)
	}

	var envelope struct {
		Object string                   `json:"object"`
		Data   []models.MaaSNativeModel `json:"data"`
	}
	if err := json.Unmarshal(body, &envelope); err != nil {
		return nil, NewMaaSError(ErrCodeInternalError, "failed to parse MaaS models response", http.StatusBadGateway)
	}
	return envelope.Data, nil
}

func buildModelsURL(rawBaseURL string) (string, error) {
	parsed, err := url.Parse(strings.TrimSpace(rawBaseURL))
	if err != nil {
		return "", fmt.Errorf("invalid MaaS base URL")
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return "", fmt.Errorf("invalid MaaS URL scheme")
	}
	if parsed.User != nil || parsed.RawQuery != "" || parsed.Fragment != "" || parsed.Hostname() == "" {
		return "", fmt.Errorf("MaaS base URL must not contain credentials, query, fragment, or an empty host")
	}
	if err := validateMaaSHost(parsed.Hostname()); err != nil {
		return "", err
	}
	return parsed.JoinPath("v1", "models").String(), nil
}

func validateMaaSHost(host string) error {
	if ip := net.ParseIP(host); ip != nil {
		return validateMaaSIP(ip)
	}
	// Hostnames are resolved and validated by maaSSafeDialContext immediately
	// before dialing. Resolving here as well would create a DNS rebinding window.
	return nil
}

func maaSSafeDialContext(
	baseDialContext func(context.Context, string, string) (net.Conn, error),
	lookupIP func(context.Context, string) ([]net.IP, error),
) func(context.Context, string, string) (net.Conn, error) {
	return func(ctx context.Context, network, addr string) (net.Conn, error) {
		host, port, err := net.SplitHostPort(addr)
		if err != nil {
			return nil, fmt.Errorf("invalid MaaS address %q: %w", addr, err)
		}

		// URL validation covers IP literals. Leave them unchanged so transport
		// wrappers such as the development port-forwarder can use localhost.
		if ip := net.ParseIP(host); ip != nil {
			return baseDialContext(ctx, network, addr)
		}

		ips, err := lookupIP(ctx, host)
		if err != nil {
			return nil, fmt.Errorf("MaaS host %q cannot be resolved: %w", host, err)
		}
		for _, ip := range ips {
			if err := validateMaaSIP(ip); err != nil {
				return nil, fmt.Errorf("MaaS host %q resolves to blocked address: %w", host, err)
			}
		}
		if len(ips) == 0 {
			return nil, fmt.Errorf("MaaS host %q resolved to no addresses", host)
		}

		// Dial the validated addresses directly. Do not resolve host again.
		var lastErr error
		for _, ip := range ips {
			conn, err := baseDialContext(ctx, network, net.JoinHostPort(ip.String(), port))
			if err == nil {
				return conn, nil
			}
			lastErr = err
		}
		return nil, lastErr
	}
}

func validateMaaSIP(ip net.IP) error {
	if ip.IsLoopback() || ip.IsLinkLocalUnicast() || ip.IsUnspecified() || ip.IsMulticast() {
		return fmt.Errorf("MaaS host resolves to a blocked address")
	}
	return nil
}

func setAuthHeader(req *http.Request, apiKey string) {
	if apiKey == "" {
		return
	}
	if req.URL.Scheme == "https" || req.URL.Hostname() == "localhost" || req.URL.Hostname() == "127.0.0.1" {
		req.Header.Set("Authorization", "Bearer "+apiKey)
	}
}

var _ MaaSClientInterface = (*MaaSClient)(nil)
var _ httpClientInterface = (*http.Client)(nil)
