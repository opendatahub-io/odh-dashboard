package mcp

import (
	"crypto/tls"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
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
	Timeout                    time.Duration
	KeepAlive                  time.Duration
	InsecureSkipVerify         bool
	MaxIdleConns               int
	IdleConnTimeout            time.Duration
	SSEEndpointPath            string
	StreamableHTTPEndpointPath string
}

// DefaultTransportOptions provides sensible defaults for transport configuration
func DefaultTransportOptions() *TransportOptions {
	return &TransportOptions{
		Timeout:                    60 * time.Second,
		KeepAlive:                  30 * time.Second,
		InsecureSkipVerify:         false,
		MaxIdleConns:               5,
		IdleConnTimeout:            30 * time.Second,
		SSEEndpointPath:            "/sse",
		StreamableHTTPEndpointPath: "/mcp",
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
	sseURL, err := f.buildTransportURL(serverURL, opts.SSEEndpointPath, "/sse")
	if err != nil {
		return nil, fmt.Errorf("failed to build SSE URL: %w", err)
	}

	slog.Debug("MCP SSE transport created", "url", sseURL)
	transport := mcp.NewSSEClientTransport(sseURL, &mcp.SSEClientTransportOptions{
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
	streamableURL, err := f.buildTransportURL(serverURL, opts.StreamableHTTPEndpointPath, "/mcp")
	if err != nil {
		return nil, fmt.Errorf("failed to build StreamableHTTP URL: %w", err)
	}

	slog.Debug("MCP StreamableHTTP transport created", "url", streamableURL)
	return &mcp.StreamableClientTransport{
		Endpoint:   streamableURL,
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
	TransportTypeStreamableHTTP TransportType = "streamable_http"
)

func ValidateTransportType(transportType TransportType) error {
	switch transportType {
	case TransportTypeSSE, TransportTypeStreamableHTTP:
		return nil
	default:
		return fmt.Errorf("unknown transport type: %s", transportType)
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

// buildTransportURL constructs the full transport URL from base URL and endpoint path
func (f *ProxiedTransportFactory) buildTransportURL(baseURL, endpointPath, defaultPath string) (string, error) {
	if baseURL == "" {
		return "", fmt.Errorf("base URL cannot be empty")
	}

	if endpointPath == "" {
		endpointPath = defaultPath
	}

	parsedURL, err := url.Parse(baseURL)
	if err != nil {
		return "", fmt.Errorf("invalid base URL %q: %w", baseURL, err)
	}

	basePath := strings.TrimSuffix(parsedURL.Path, "/")
	endpointPath = strings.TrimPrefix(endpointPath, "/")

	if basePath == "" {
		parsedURL.Path = "/" + endpointPath
	} else {
		parsedURL.Path = basePath + "/" + endpointPath
	}

	return parsedURL.String(), nil
}
