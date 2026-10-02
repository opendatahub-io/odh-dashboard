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
	"strconv"
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

// NewDefaultHTTPClient creates the configured transport shared by MaaS clients.
func NewDefaultHTTPClient(cfg MaaSClientConfig) *http.Client {
	tlsConfig := &tls.Config{
		InsecureSkipVerify: cfg.InsecureSkipVerify, //nolint:gosec // controlled by development-only config
		MinVersion:         tls.VersionTLS12,
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
	return &http.Client{
		Transport: rt,
		CheckRedirect: func(_ *http.Request, _ []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}
}

func NewMaaSClient(httpClient httpClientInterface) *MaaSClient {
	return &MaaSClient{httpClient: httpClient}
}

func NewDefaultMaaSClient(cfg MaaSClientConfig) *MaaSClient {
	return NewMaaSClient(NewDefaultHTTPClient(cfg))
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
	parsed, err := ValidateBaseURL(rawBaseURL)
	if err != nil {
		return "", err
	}
	return parsed.JoinPath("v1", "models").String(), nil
}

// ValidateBaseURL validates and returns the sanitized URL used by every MaaS
// client. DNS addresses are validated immediately before dialing by
// maaSSafeDialContext, while literal addresses are rejected here.
func ValidateBaseURL(rawBaseURL string) (*url.URL, error) {
	parsed, err := url.Parse(strings.TrimSpace(rawBaseURL))
	if err != nil || parsed.Scheme != "http" && parsed.Scheme != "https" {
		return nil, fmt.Errorf("invalid MaaS base URL")
	}
	host := parsed.Hostname()
	if parsed.User != nil || parsed.RawQuery != "" || parsed.Fragment != "" || host == "" || parsed.Opaque != "" {
		return nil, fmt.Errorf("MaaS base URL contains unsupported credentials, query, fragment, host, or path")
	}
	if parsed.Scheme == "http" {
		return nil, fmt.Errorf("MaaS base URL must use HTTPS")
	}
	if strings.EqualFold(strings.TrimSuffix(host, "."), "localhost") {
		return nil, fmt.Errorf("MaaS host resolves to a blocked address")
	}
	if port := parsed.Port(); port != "" {
		portNumber, err := strconv.Atoi(port)
		if err != nil || portNumber < 1 || portNumber > 65535 {
			return nil, fmt.Errorf("MaaS base URL contains an unsupported port")
		}
	}
	if strings.Contains(parsed.Path, "\\") || strings.Contains(parsed.Path, "/../") || strings.HasSuffix(parsed.Path, "/..") {
		return nil, fmt.Errorf("MaaS base URL contains an unsupported path")
	}
	if ip := net.ParseIP(host); ip != nil {
		if err := validateMaaSIP(ip); err != nil {
			return nil, err
		}
	}
	return parsed, nil
}

func isLocalMaaSHost(host string) bool {
	return strings.EqualFold(host, "localhost") || host == "127.0.0.1" || host == "::1"
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

		if ip := net.ParseIP(host); ip != nil {
			if err := validateMaaSIP(ip); err != nil {
				return nil, err
			}
			return baseDialContext(ctx, network, addr)
		}

		ips, err := lookupIP(ctx, host)
		if err != nil {
			return nil, fmt.Errorf("MaaS host %q cannot be resolved: %w", host, err)
		}
		allowLocalhost := strings.EqualFold(host, "localhost")
		for _, ip := range ips {
			if allowLocalhost {
				if !ip.IsLoopback() {
					return nil, fmt.Errorf("MaaS host %q resolves to blocked address", host)
				}
				continue
			}
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
	if ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() || ip.IsUnspecified() || ip.IsMulticast() {
		return fmt.Errorf("MaaS host resolves to a blocked address")
	}
	return nil
}

func setAuthHeader(req *http.Request, apiKey string) {
	if apiKey == "" {
		return
	}
	if req.URL.Scheme == "https" || isLocalMaaSHost(req.URL.Hostname()) {
		req.Header.Set("Authorization", "Bearer "+apiKey)
	}
}

var _ MaaSClientInterface = (*MaaSClient)(nil)
var _ httpClientInterface = (*http.Client)(nil)
