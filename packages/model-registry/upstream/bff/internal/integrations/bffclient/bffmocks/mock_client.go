package bffmocks

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/url"
	"strings"
	"sync"

	"github.com/kubeflow/hub/ui/bff/internal/integrations/bffclient"
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

// Call returns mock responses based on target and path
func (m *MockBFFClient) Call(ctx context.Context, method, path string, body interface{}, response interface{}) error {
	// Use custom handler if provided
	if m.CallHandler != nil {
		return m.CallHandler(ctx, method, path, body, response)
	}

	switch m.target {
	case bffclient.BFFTargetMLflow:
		return m.handleMLflowCall(ctx, method, path, body, response)
	default:
		return bffclient.NewBFFClientErrorWithTarget(bffclient.ErrCodeNotFound, fmt.Sprintf("mock not implemented for target %s", m.target), m.target, 404)
	}
}

// handleMLflowCall handles mock calls to the MLflow BFF
func (m *MockBFFClient) handleMLflowCall(ctx context.Context, method, path string, body interface{}, response interface{}) error {
	switch {
	case strings.HasPrefix(path, "/mcp-registry/servers/") && method == "GET":
		name := extractMockMCPServerName(path)
		server := map[string]interface{}{
			"name":         name,
			"display_name": mockDisplayNameForServer(name),
		}
		return marshalToResponse(map[string]interface{}{"data": server}, response)

	default:
		return bffclient.NewNotFoundError(m.target, fmt.Sprintf("mock not implemented for %s %s", method, path))
	}
}

// extractMockMCPServerName pulls the server name back out of a
// "/mcp-registry/servers/<name>?workspace=<ns>" path. Names may contain "/"
// (the upstream <namespace>/<slug> convention) so it's not URL-escaped.
func extractMockMCPServerName(path string) string {
	trimmed := strings.TrimPrefix(path, "/mcp-registry/servers/")
	if idx := strings.Index(trimmed, "?"); idx != -1 {
		trimmed = trimmed[:idx]
	}
	if decoded, err := url.PathUnescape(trimmed); err == nil {
		return decoded
	}
	return trimmed
}

func mockDisplayNameForServer(name string) string {
	if idx := strings.LastIndex(name, "/"); idx != -1 && idx < len(name)-1 {
		return name[idx+1:]
	}
	return name
}

// marshalToResponse marshals a map to the response interface
func marshalToResponse(data interface{}, response interface{}) error {
	if response == nil {
		return nil
	}

	jsonBytes, err := json.Marshal(data)
	if err != nil {
		return err
	}

	return json.Unmarshal(jsonBytes, response)
}

// IsAvailable returns the mock availability status
func (m *MockBFFClient) IsAvailable(ctx context.Context) bool {
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
func (f *MockClientFactory) CreateClientWithHeaders(target bffclient.BFFTarget, authToken string, headers map[string]string) bffclient.BFFClientInterface {
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

// IsTargetConfigured checks if the target is configured in ServiceConfigs
func (f *MockClientFactory) IsTargetConfigured(target bffclient.BFFTarget) bool {
	return f.config.GetServiceConfig(target) != nil
}

// GetMockClient returns the mock client for a specific target (for test assertions)
func (f *MockClientFactory) GetMockClient(target bffclient.BFFTarget) *MockBFFClient {
	f.clientsMu.RLock()
	defer f.clientsMu.RUnlock()
	return f.clients[target]
}
