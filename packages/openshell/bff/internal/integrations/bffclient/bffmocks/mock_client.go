package bffmocks

import (
	"context"
	"crypto/x509"
	"fmt"
	"log/slog"
	"sync"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/bffclient"
)

// MockBFFClient provides a mock implementation of the BFFClientInterface for testing
type MockBFFClient struct {
	target    bffclient.BFFTarget
	baseURL   string
	available bool

	// CallHandler allows customizing the mock response for specific calls
	// If nil, default mock responses are used
	CallHandler func(ctx context.Context, method, path string, body interface{}, response interface{}) error
}

// NewMockBFFClient creates a new mock BFF client
func NewMockBFFClient(target bffclient.BFFTarget) *MockBFFClient {
	return &MockBFFClient{
		target:    target,
		baseURL:   fmt.Sprintf("http://mock-%s.test.svc.cluster.local:8080/api/v1", target),
		available: true,
	}
}

// Call returns mock responses based on the configured CallHandler.
// Set CallHandler to customize responses for your target BFF's endpoints.
// Without a CallHandler, returns a NOT_FOUND error for all calls.
func (m *MockBFFClient) Call(ctx context.Context, method, path string, body interface{}, response interface{}) error {
	if m.CallHandler != nil {
		return m.CallHandler(ctx, method, path, body, response)
	}

	return bffclient.NewNotFoundError(m.target, fmt.Sprintf("mock not implemented for %s %s on target %s — set CallHandler to customize", method, path, m.target))
}

// IsAvailable returns the mock availability status
func (m *MockBFFClient) IsAvailable(_ context.Context) bool {
	return m.available
}

// GetBaseURL returns the mock base URL
func (m *MockBFFClient) GetBaseURL() string {
	return m.baseURL
}

// GetTarget returns the target BFF identifier
func (m *MockBFFClient) GetTarget() bffclient.BFFTarget {
	return m.target
}

// SetAvailable allows tests to control the availability status
func (m *MockBFFClient) SetAvailable(available bool) {
	m.available = available
}

// MockClientFactory creates mock BFF clients for testing
type MockClientFactory struct {
	config    *bffclient.BFFClientConfig
	clients   map[bffclient.BFFTarget]*MockBFFClient
	clientsMu sync.RWMutex
	logger    *slog.Logger
}

// NewMockClientFactory creates a new mock client factory
func NewMockClientFactory(logger *slog.Logger) bffclient.BFFClientFactory {
	config := bffclient.NewDefaultBFFClientConfig()
	config.MockBFFClients = true

	return &MockClientFactory{
		config:  config,
		clients: make(map[bffclient.BFFTarget]*MockBFFClient),
		logger:  logger,
	}
}

// CreateClient creates a new mock BFF client for the specified target
func (f *MockClientFactory) CreateClient(target bffclient.BFFTarget, authToken string) bffclient.BFFClientInterface {
	return f.CreateClientWithHeaders(target, authToken, nil)
}

// CreateClientWithHeaders creates a new mock BFF client (headers are ignored in mock)
func (f *MockClientFactory) CreateClientWithHeaders(target bffclient.BFFTarget, _ string, _ map[string]string) bffclient.BFFClientInterface {
	// Check if client already exists (read lock)
	f.clientsMu.RLock()
	if client, ok := f.clients[target]; ok {
		f.clientsMu.RUnlock()
		return client
	}
	f.clientsMu.RUnlock()

	// Create new mock client (write lock)
	f.clientsMu.Lock()
	defer f.clientsMu.Unlock()

	// Double-check after acquiring write lock
	if client, ok := f.clients[target]; ok {
		return client
	}

	client := NewMockBFFClient(target)
	f.clients[target] = client

	if f.logger != nil {
		f.logger.Debug("Created mock BFF client", "target", target)
	}

	return client
}

// GetConfig returns the configuration for a specific target
func (f *MockClientFactory) GetConfig(target bffclient.BFFTarget) *bffclient.BFFServiceConfig {
	return f.config.GetServiceConfig(target)
}

// IsTargetConfigured always returns true for mock factory (all targets available)
func (f *MockClientFactory) IsTargetConfigured(_ bffclient.BFFTarget) bool {
	return true
}

// GetMockClient returns the mock client for a specific target (for test assertions)
func (f *MockClientFactory) GetMockClient(target bffclient.BFFTarget) *MockBFFClient {
	f.clientsMu.RLock()
	defer f.clientsMu.RUnlock()
	return f.clients[target]
}

// NewMockClientFactoryWithConfig creates a new mock client factory with custom config
func NewMockClientFactoryWithConfig(config *bffclient.BFFClientConfig, _ *x509.CertPool, _ bool, logger *slog.Logger) bffclient.BFFClientFactory {
	return &MockClientFactory{
		config:  config,
		clients: make(map[bffclient.BFFTarget]*MockBFFClient),
		logger:  logger,
	}
}
