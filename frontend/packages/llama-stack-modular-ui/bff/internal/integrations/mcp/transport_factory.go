package mcp

import (
	"crypto/tls"
	"fmt"
	"log/slog"
	"net/http"

	"time"

	"github.com/modelcontextprotocol/go-sdk/mcp"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/integrations"
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
