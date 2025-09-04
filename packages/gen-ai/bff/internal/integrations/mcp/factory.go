package mcp

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"

	"strings"

	"github.com/opendatahub-io/gen-ai/internal/config"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
)

// MCPClientFactory interface for creating MCP clients
type MCPClientFactory interface {
	GetClient(ctx context.Context) (MCPClientInterface, error)
	ExtractRequestIdentity(httpHeader http.Header) (*integrations.RequestIdentity, error)
	ValidateRequestIdentity(identity *integrations.RequestIdentity) error
}

// ProxiedClientFactory creates MCP clients that connect through Kubernetes services
type ProxiedClientFactory struct {
	Logger    *slog.Logger
	Header    string
	Prefix    string
	MCPConfig *MCPClientConfig // Optional custom MCP configuration
}

// NewMCPClientFactory creates a new MCP client factory
func NewMCPClientFactory(cfg config.EnvConfig, logger *slog.Logger) (MCPClientFactory, error) {
	// Create MCP configuration from environment variables
	mcpConfig := createMCPConfigFromEnv()

	// For now, we only support proxied connections through Kubernetes
	// In the future, we could add support for direct connections based on config
	return NewProxiedClientFactoryWithConfig(logger, cfg, mcpConfig), nil
}

// createMCPConfigFromEnv creates MCP configuration from environment variables
func createMCPConfigFromEnv() *MCPClientConfig {
	config := DefaultMCPClientConfig()

	// Transport type is now determined per-server from ConfigMap
	// No transport-related environment variables needed anymore

	return config
}

// NewProxiedClientFactory creates a factory for proxied MCP clients
func NewProxiedClientFactory(logger *slog.Logger, cfg config.EnvConfig) *ProxiedClientFactory {
	return &ProxiedClientFactory{
		Logger:    logger,
		Header:    cfg.AuthTokenHeader,
		Prefix:    cfg.AuthTokenPrefix,
		MCPConfig: nil, // Use default config, can be overridden later
	}
}

// NewProxiedClientFactoryWithConfig creates a factory with custom MCP configuration
func NewProxiedClientFactoryWithConfig(logger *slog.Logger, cfg config.EnvConfig, mcpConfig *MCPClientConfig) *ProxiedClientFactory {
	return &ProxiedClientFactory{
		Logger:    logger,
		Header:    cfg.AuthTokenHeader,
		Prefix:    cfg.AuthTokenPrefix,
		MCPConfig: mcpConfig,
	}
}

// ExtractRequestIdentity extracts identity from HTTP headers (same pattern as K8s client)
func (f *ProxiedClientFactory) ExtractRequestIdentity(httpHeader http.Header) (*integrations.RequestIdentity, error) {
	raw := httpHeader.Get(f.Header)
	if raw == "" {
		return nil, fmt.Errorf("missing required Header: %s", f.Header)
	}

	token := raw
	if f.Prefix != "" {
		if !strings.HasPrefix(raw, f.Prefix) {
			return nil, fmt.Errorf("expected token Header %s to start with Prefix %q", f.Header, f.Prefix)
		}
		token = strings.TrimPrefix(raw, f.Prefix)
	}

	return &integrations.RequestIdentity{
		Token: strings.TrimSpace(token),
	}, nil
}

// ValidateRequestIdentity validates the request identity
func (f *ProxiedClientFactory) ValidateRequestIdentity(identity *integrations.RequestIdentity) error {
	if identity == nil {
		return errors.New("missing identity")
	}

	if identity.Token == "" {
		return errors.New("token is required for MCP client authentication")
	}

	return nil
}

// GetClient creates a new MCP client instance
func (f *ProxiedClientFactory) GetClient(ctx context.Context) (MCPClientInterface, error) {
	// For proxied connections, we don't need the identity here as it will be passed
	// to individual method calls. The client will use the Kubernetes proxy to reach MCP servers.
	if f.MCPConfig != nil {
		return NewProxiedMCPClientWithConfig(f.Logger, f.MCPConfig), nil
	}
	return NewProxiedMCPClient(f.Logger), nil
}
