package mcp

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"

	"github.com/opendatahub-io/gen-ai/internal/config"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
)

// MCPClientFactory interface for creating MCP clients
type MCPClientFactory interface {
	GetClient(ctx context.Context) (MCPClientInterface, error)
	ExtractRequestIdentity(httpHeader http.Header) (*integrations.RequestIdentity, error)
	ValidateRequestIdentity(identity *integrations.RequestIdentity) error
}

// SimpleClientFactory creates stateless MCP clients
type SimpleClientFactory struct {
	Logger    *slog.Logger
	Header    string
	Prefix    string
	MCPConfig *MCPClientConfig
}

// NewMCPClientFactory creates a new MCP client factory
func NewMCPClientFactory(cfg config.EnvConfig, logger *slog.Logger) (MCPClientFactory, error) {
	mcpConfig := createMCPConfigFromEnv()
	return NewSimpleClientFactoryWithConfig(logger, cfg, mcpConfig), nil
}

// createMCPConfigFromEnv creates MCP configuration from environment variables
func createMCPConfigFromEnv() *MCPClientConfig {
	config := DefaultMCPClientConfig()
	return config
}

// NewSimpleClientFactory creates a factory for simple MCP clients
func NewSimpleClientFactory(logger *slog.Logger, cfg config.EnvConfig) *SimpleClientFactory {
	return &SimpleClientFactory{
		Logger:    logger,
		Header:    cfg.AuthTokenHeader,
		Prefix:    cfg.AuthTokenPrefix,
		MCPConfig: nil,
	}
}

// NewSimpleClientFactoryWithConfig creates a factory with custom MCP configuration
func NewSimpleClientFactoryWithConfig(logger *slog.Logger, cfg config.EnvConfig, mcpConfig *MCPClientConfig) *SimpleClientFactory {
	return &SimpleClientFactory{
		Logger:    logger,
		Header:    cfg.AuthTokenHeader,
		Prefix:    cfg.AuthTokenPrefix,
		MCPConfig: mcpConfig,
	}
}

// ExtractRequestIdentity extracts identity from HTTP headers
func (f *SimpleClientFactory) ExtractRequestIdentity(httpHeader http.Header) (*integrations.RequestIdentity, error) {
	k8sToken, err := f.extractK8sToken(httpHeader)
	if err != nil {
		return nil, err
	}

	mcpToken, err := f.extractMCPToken(httpHeader)
	if err != nil {
		return nil, err
	}

	return &integrations.RequestIdentity{
		Token:    k8sToken,
		MCPToken: mcpToken,
	}, nil
}

// extractK8sToken extracts the Kubernetes authentication token
func (f *SimpleClientFactory) extractK8sToken(httpHeader http.Header) (string, error) {
	raw := httpHeader.Get(f.Header)
	if raw == "" {
		return "", fmt.Errorf("missing required Header: %s", f.Header)
	}

	token := raw
	if f.Prefix != "" {
		if !strings.HasPrefix(raw, f.Prefix) {
			return "", fmt.Errorf("expected token Header %s to start with Prefix %q", f.Header, f.Prefix)
		}
		token = strings.TrimPrefix(raw, f.Prefix)
	}

	return strings.TrimSpace(token), nil
}

// extractMCPToken extracts the MCP server authentication token
func (f *SimpleClientFactory) extractMCPToken(httpHeader http.Header) (string, error) {
	raw := httpHeader.Get(constants.MCPBearerHeader)
	if raw == "" {
		return "", nil
	}

	if !strings.HasPrefix(raw, "Bearer ") {
		return "", fmt.Errorf("malformed MCP token: expected %s header to start with 'Bearer '",
			constants.MCPBearerHeader)
	}

	token := strings.TrimPrefix(raw, "Bearer ")
	return strings.TrimSpace(token), nil
}

// ValidateRequestIdentity validates the request identity
func (f *SimpleClientFactory) ValidateRequestIdentity(identity *integrations.RequestIdentity) error {
	if identity == nil {
		return errors.New("missing identity")
	}

	if identity.Token == "" {
		return errors.New("token is required for MCP client authentication")
	}

	return nil
}

// GetClient creates a new MCP client instance
func (f *SimpleClientFactory) GetClient(ctx context.Context) (MCPClientInterface, error) {
	if f.MCPConfig != nil {
		return NewSimpleMCPClientWithConfig(f.Logger, f.MCPConfig), nil
	}
	return NewSimpleMCPClient(f.Logger), nil
}
