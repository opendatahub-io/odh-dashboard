package mcpmocks

import (
	"context"
	"log/slog"
	"net/http"
	"strings"

	"github.com/opendatahub-io/gen-ai/internal/config"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/mcp"
)

// MockedMCPClientFactory implements MCPClientFactory for testing
type MockedMCPClientFactory struct {
	logger         *slog.Logger
	fixedTimestamp *int64 // For deterministic testing
}

// NewMockedMCPClientFactory creates a new mocked MCP client factory
func NewMockedMCPClientFactory(cfg config.EnvConfig, logger *slog.Logger) mcp.MCPClientFactory {
	return &MockedMCPClientFactory{
		logger: logger,
	}
}

// NewMockedMCPClientFactoryWithFixedTime creates a new mocked MCP client factory with fixed timestamp for deterministic testing
func NewMockedMCPClientFactoryWithFixedTime(cfg config.EnvConfig, logger *slog.Logger, timestamp int64) mcp.MCPClientFactory {
	return &MockedMCPClientFactory{
		logger:         logger,
		fixedTimestamp: &timestamp,
	}
}

// ExtractRequestIdentity extracts identity from HTTP headers
func (f *MockedMCPClientFactory) ExtractRequestIdentity(httpHeader http.Header) (*integrations.RequestIdentity, error) {
	k8sToken := f.extractTokenFromHeader(httpHeader.Get("Authorization"), "Bearer ")
	if k8sToken == "" {
		k8sToken = "FAKE_K8S_TOKEN"
	}

	mcpToken := ""
	if mcpRaw := httpHeader.Get(constants.MCPBearerHeader); mcpRaw != "" {
		mcpToken = f.extractTokenFromHeader(mcpRaw, "Bearer ")
	}

	return &integrations.RequestIdentity{
		Token:    k8sToken,
		MCPToken: mcpToken,
	}, nil
}

// extractTokenFromHeader extracts token from header value with prefix stripping
func (f *MockedMCPClientFactory) extractTokenFromHeader(headerValue, prefix string) string {
	if headerValue == "" {
		return ""
	}
	if strings.HasPrefix(headerValue, prefix) {
		return strings.TrimSpace(strings.TrimPrefix(headerValue, prefix))
	}
	return strings.TrimSpace(headerValue)
}

// ValidateRequestIdentity validates the request identity
func (f *MockedMCPClientFactory) ValidateRequestIdentity(identity *integrations.RequestIdentity) error {
	return nil
}

// GetClient creates a new mock MCP client instance
func (f *MockedMCPClientFactory) GetClient(ctx context.Context) (mcp.MCPClientInterface, error) {
	if f.fixedTimestamp != nil {
		return NewMockMCPClientWithFixedTime(f.logger, *f.fixedTimestamp), nil
	}
	return NewMockMCPClient(f.logger), nil
}
