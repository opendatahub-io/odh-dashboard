package mcpmocks

import (
	"context"
	"log/slog"
	"net/http"

	"github.com/opendatahub-io/gen-ai/internal/config"
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

// ExtractRequestIdentity extracts identity from HTTP headers (mock implementation)
func (f *MockedMCPClientFactory) ExtractRequestIdentity(httpHeader http.Header) (*integrations.RequestIdentity, error) {
	// For mocks, we'll accept any token or use a default one
	token := httpHeader.Get("Authorization")
	if token == "" {
		token = "Bearer FAKE_MCP_TOKEN"
	}

	// Strip "Bearer " prefix if present
	if len(token) > 7 && token[:7] == "Bearer " {
		token = token[7:]
	}

	return &integrations.RequestIdentity{
		Token: token,
	}, nil
}

// ValidateRequestIdentity validates the request identity (mock implementation)
func (f *MockedMCPClientFactory) ValidateRequestIdentity(identity *integrations.RequestIdentity) error {
	// For mocks, we accept any identity
	return nil
}

// GetClient creates a new mock MCP client instance
func (f *MockedMCPClientFactory) GetClient(ctx context.Context) (mcp.MCPClientInterface, error) {
	if f.fixedTimestamp != nil {
		return NewMockMCPClientWithFixedTime(f.logger, *f.fixedTimestamp), nil
	}
	return NewMockMCPClient(f.logger), nil
}
