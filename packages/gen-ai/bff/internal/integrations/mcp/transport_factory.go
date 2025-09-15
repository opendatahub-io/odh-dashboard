package mcp

import (
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
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

// MCPTransportFactory creates transports for MCP server connections
type MCPTransportFactory struct {
	defaultOptions *TransportOptions
}

// NewMCPTransportFactory creates a new transport factory for MCP server connections
func NewMCPTransportFactory(opts *TransportOptions) *MCPTransportFactory {
	if opts == nil {
		opts = DefaultTransportOptions()
	}
	return &MCPTransportFactory{
		defaultOptions: opts,
	}
}

func (f *MCPTransportFactory) CreateSSETransport(
	serverURL string,
	identity *integrations.RequestIdentity,
	opts *TransportOptions,
) (mcp.Transport, error) {
	if opts == nil {
		opts = f.defaultOptions
	}

	httpClient := f.createMCPHTTPClient(opts, identity)

	slog.Debug("MCP SSE transport created", "url", serverURL)
	transport := &mcp.SSEClientTransport{
		Endpoint:   serverURL,
		HTTPClient: httpClient,
	}

	return transport, nil
}

func (f *MCPTransportFactory) CreateStreamableHTTPTransport(
	serverURL string,
	identity *integrations.RequestIdentity,
	opts *TransportOptions,
) (mcp.Transport, error) {
	if opts == nil {
		opts = f.defaultOptions
	}

	httpClient := f.createMCPHTTPClient(opts, identity)

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

// MCPErrorHandlingTransport wraps the base transport to handle HTTP error responses
// that contain JSON error messages, providing consistent error handling across all MCP transports
type MCPErrorHandlingTransport struct {
	Base http.RoundTripper
}

func (t *MCPErrorHandlingTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	if t.Base == nil {
		t.Base = http.DefaultTransport
	}

	resp, err := t.Base.RoundTrip(req)
	if err != nil {
		return resp, err
	}

	if resp.StatusCode >= 400 {
		return t.handleErrorResponse(resp)
	}

	return resp, nil
}

// handleErrorResponse reads JSON error responses and converts them to meaningful error messages
func (t *MCPErrorHandlingTransport) handleErrorResponse(resp *http.Response) (*http.Response, error) {
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("HTTP %d: failed to read error response", resp.StatusCode)
	}

	var jsonError map[string]interface{}
	if err := json.Unmarshal(body, &jsonError); err == nil {
		if errorMsg, ok := jsonError["error"].(string); ok {
			return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, errorMsg)
		}
		if message, ok := jsonError["message"].(string); ok {
			return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, message)
		}
		if detail, ok := jsonError["detail"].(string); ok {
			return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, detail)
		}
		return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(body))
	}

	return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(body))
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

// ValidateAndNormalizeTransportType validates the transport type and falls back to streamable-http with info logging
func ValidateAndNormalizeTransportType(transportType string, logger *slog.Logger, serverURL string) TransportType {
	switch transportType {
	case string(TransportTypeSSE):
		return TransportTypeSSE
	case string(TransportTypeStreamableHTTP):
		return TransportTypeStreamableHTTP
	default:
		logger.Info("Invalid or missing transport type, falling back to streamable-http",
			"server", serverURL, "type", transportType)
		return TransportTypeStreamableHTTP
	}
}

// createMCPHTTPClient creates a configured HTTP client with authentication and MCP error handling
func (f *MCPTransportFactory) createMCPHTTPClient(opts *TransportOptions, identity *integrations.RequestIdentity) *http.Client {
	baseTransport := &http.Transport{
		TLSClientConfig: &tls.Config{
			InsecureSkipVerify: opts.InsecureSkipVerify,
		},
		MaxIdleConns:    opts.MaxIdleConns,
		IdleConnTimeout: opts.IdleConnTimeout,
	}

	var transport http.RoundTripper = baseTransport

	transport = &MCPErrorHandlingTransport{
		Base: transport,
	}

	// Add authentication layer using MCP token if available
	if identity != nil && identity.MCPToken != "" {
		transport = &AuthenticatedTransport{
			Base:  transport,
			Token: identity.MCPToken,
		}
	}

	return &http.Client{
		Timeout:   opts.Timeout,
		Transport: transport,
	}
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
