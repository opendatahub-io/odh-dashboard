package mcp

import (
	"crypto/tls"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/modelcontextprotocol/go-sdk/mcp"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
)

// TransportFactory interface for creating MCP client transports
type TransportFactory interface {
	CreateSSETransport(serverURL string, identity *integrations.RequestIdentity, opts *TransportOptions) (mcp.Transport, error)
	CreateStreamableHTTPTransport(serverURL string, identity *integrations.RequestIdentity, opts *TransportOptions) (mcp.Transport, error)
}

// TransportOptions contains configuration for transport creation
type TransportOptions struct {
	Timeout            time.Duration
	KeepAlive          time.Duration
	InsecureSkipVerify bool
	MaxIdleConns       int
	IdleConnTimeout    time.Duration
}

// DefaultTransportOptions provides sensible defaults for transport configuration
func DefaultTransportOptions() *TransportOptions {
	return &TransportOptions{
		Timeout:            60 * time.Second,
		KeepAlive:          30 * time.Second,
		InsecureSkipVerify: false,
		MaxIdleConns:       5,
		IdleConnTimeout:    30 * time.Second,
	}
}

// ProxiedTransportFactory creates transports for MCP servers accessible through Kubernetes proxy
type ProxiedTransportFactory struct {
	defaultOptions *TransportOptions
}

// NewProxiedTransportFactory creates a new transport factory for proxied connections
func NewProxiedTransportFactory(opts *TransportOptions) *ProxiedTransportFactory {
	if opts == nil {
		opts = DefaultTransportOptions()
	}
	return &ProxiedTransportFactory{
		defaultOptions: opts,
	}
}

func (f *ProxiedTransportFactory) CreateSSETransport(
	serverURL string,
	identity *integrations.RequestIdentity,
	opts *TransportOptions,
) (mcp.Transport, error) {
	if opts == nil {
		opts = f.defaultOptions
	}

	httpClient := f.createHTTPClient(opts, identity)

	// Use the server URL directly since it already contains the endpoint path
	slog.Debug("MCP SSE transport created", "url", serverURL)
	transport := mcp.NewSSEClientTransport(serverURL, &mcp.SSEClientTransportOptions{
		HTTPClient: httpClient,
	})

	return transport, nil
}

func (f *ProxiedTransportFactory) CreateStreamableHTTPTransport(
	serverURL string,
	identity *integrations.RequestIdentity,
	opts *TransportOptions,
) (mcp.Transport, error) {
	if opts == nil {
		opts = f.defaultOptions
	}

	httpClient := f.createHTTPClient(opts, identity)

	// Use the server URL directly since it already contains the endpoint path
	slog.Debug("MCP StreamableHTTP transport created", "url", serverURL)
	return &mcp.StreamableClientTransport{
		Endpoint:   serverURL,
		HTTPClient: httpClient,
	}, nil
}

// AuthenticatedTransport wraps an HTTP transport to add authentication headers
type AuthenticatedTransport struct {
	Base  http.RoundTripper
	Token string
}

func (t *AuthenticatedTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	newReq := req.Clone(req.Context())

	if t.Token != "" {
		newReq.Header.Set("Authorization", "Bearer "+t.Token)
	}

	if t.Base == nil {
		t.Base = http.DefaultTransport
	}

	return t.Base.RoundTrip(newReq)
}

// TransportType represents the different types of transports available
type TransportType string

const (
	// TransportTypeSSE represents Server-Sent Events transport
	TransportTypeSSE TransportType = "sse"
	// TransportTypeStreamableHTTP represents StreamableHTTP transport
	TransportTypeStreamableHTTP TransportType = "streamable-http"
)

func ValidateTransportType(transportType TransportType) error {
	switch transportType {
	case TransportTypeSSE, TransportTypeStreamableHTTP:
		return nil
	default:
		return fmt.Errorf("unknown transport type: %s", transportType)
	}
}

// ValidateAndNormalizeTransportType validates the transport type and falls back to SSE with info logging
func ValidateAndNormalizeTransportType(transportType string, logger *slog.Logger, serverURL string) TransportType {
	switch transportType {
	case string(TransportTypeSSE):
		return TransportTypeSSE
	case string(TransportTypeStreamableHTTP):
		return TransportTypeStreamableHTTP
	default:
		logger.Info("Invalid or missing transport type, falling back to SSE",
			"server", serverURL, "type", transportType)
		return TransportTypeSSE
	}
}

// createHTTPClient creates a configured HTTP client with optional authentication
func (f *ProxiedTransportFactory) createHTTPClient(opts *TransportOptions, identity *integrations.RequestIdentity) *http.Client {
	httpClient := &http.Client{
		Timeout: opts.Timeout,
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{
				InsecureSkipVerify: opts.InsecureSkipVerify,
			},
			MaxIdleConns:    opts.MaxIdleConns,
			IdleConnTimeout: opts.IdleConnTimeout,
		},
	}

	if identity != nil && identity.Token != "" {
		originalTransport := httpClient.Transport
		httpClient.Transport = &AuthenticatedTransport{
			Base:  originalTransport,
			Token: identity.Token,
		}
	}

	return httpClient
}

// checkForJSONErrorResponse makes a preliminary request to detect non-SSE responses
func (f *ProxiedTransportFactory) checkForJSONErrorResponse(serverURL string, httpClient *http.Client) error {
	req, err := http.NewRequest("GET", serverURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers to accept SSE - this is what a real SSE client would send
	req.Header.Set("Accept", "text/event-stream")
	req.Header.Set("Cache-Control", "no-cache")

	resp, err := httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to connect to server: %w", err)
	}
	defer resp.Body.Close()

	// Read response body for analysis
	body, readErr := io.ReadAll(resp.Body)
	if readErr != nil {
		return fmt.Errorf("failed to read server response (status: %d)", resp.StatusCode)
	}

	// For any error status code, return the response body as context
	if resp.StatusCode >= 400 {
		return &NonSSEResponseError{
			StatusCode: resp.StatusCode,
			Body:       string(body),
			Headers:    resp.Header,
		}
	}

	// Check content type to see if it's not SSE
	contentType := resp.Header.Get("Content-Type")
	if contentType != "" && !f.isSSEContentType(contentType) {
		return &NonSSEResponseError{
			StatusCode: resp.StatusCode,
			Body:       string(body),
			Headers:    resp.Header,
		}
	}

	// Check response body format to detect JSON or other non-SSE formats
	if len(body) > 0 && f.looksLikeJSON(body) {
		return &NonSSEResponseError{
			StatusCode: resp.StatusCode,
			Body:       string(body),
			Headers:    resp.Header,
		}
	}

	// If we reach here, the response appears to be a valid SSE stream
	return nil
}

// NonSSEResponseError represents a response that should be SSE but isn't
type NonSSEResponseError struct {
	StatusCode int
	Body       string
	Headers    http.Header
}

func (e *NonSSEResponseError) Error() string {
	return fmt.Sprintf("expected SSE stream but got HTTP %d: %s", e.StatusCode, e.Body)
}

// isSSEContentType checks if the content type indicates SSE
func (f *ProxiedTransportFactory) isSSEContentType(contentType string) bool {
	lower := strings.ToLower(contentType)
	return strings.Contains(lower, "text/event-stream") ||
		strings.Contains(lower, "text/plain") // Some servers use text/plain for SSE
}

// looksLikeJSON attempts to detect if response body is JSON
func (f *ProxiedTransportFactory) looksLikeJSON(body []byte) bool {
	trimmed := strings.TrimSpace(string(body))
	if len(trimmed) == 0 {
		return false
	}

	// Check if it starts with JSON object or array
	firstChar := trimmed[0]
	return firstChar == '{' || firstChar == '['
}
