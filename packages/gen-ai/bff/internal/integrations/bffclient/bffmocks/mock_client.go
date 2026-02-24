package bffmocks

import (
	"context"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/opendatahub-io/gen-ai/internal/integrations/bffclient"
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

	// Default mock responses based on target
	switch m.target {
	case bffclient.BFFTargetMaaS:
		return m.handleMaaSCall(ctx, method, path, body, response)
	case bffclient.BFFTargetGenAI:
		return m.handleGenAICall(ctx, method, path, body, response)
	case bffclient.BFFTargetModelRegistry:
		return m.handleModelRegistryCall(ctx, method, path, body, response)
	default:
		return bffclient.NewBFFClientErrorWithTarget(bffclient.ErrCodeNotFound, fmt.Sprintf("mock not implemented for target %s", m.target), m.target, 404)
	}
}

// handleMaaSCall handles mock calls to MaaS BFF
func (m *MockBFFClient) handleMaaSCall(ctx context.Context, method, path string, body interface{}, response interface{}) error {
	switch {
	case path == "/tokens" && method == "POST":
		// Mock token creation response
		tokenResp := map[string]interface{}{
			"token":     "mock-ephemeral-token-" + fmt.Sprintf("%d", time.Now().Unix()),
			"expiresAt": time.Now().Add(4 * time.Hour).Unix(),
		}
		return marshalToResponse(tokenResp, response)

	case path == "/tokens" && method == "DELETE":
		// Mock token revocation (no response body)
		return nil

	case path == "/models" && method == "GET":
		// Mock models list
		modelsResp := map[string]interface{}{
			"object": "list",
			"data": []map[string]interface{}{
				{
					"id":      "mock-model-1",
					"object":  "model",
					"created": time.Now().Unix(),
					"ownedBy": "mock-owner",
					"ready":   true,
				},
			},
		}
		return marshalToResponse(modelsResp, response)

	default:
		return bffclient.NewNotFoundError(m.target, fmt.Sprintf("mock not implemented for %s %s", method, path))
	}
}

// handleGenAICall handles mock calls to Gen-AI BFF
func (m *MockBFFClient) handleGenAICall(ctx context.Context, method, path string, body interface{}, response interface{}) error {
	// Add Gen-AI specific mock responses as needed
	return bffclient.NewNotFoundError(m.target, fmt.Sprintf("mock not implemented for %s %s", method, path))
}

// handleModelRegistryCall handles mock calls to Model Registry BFF
func (m *MockBFFClient) handleModelRegistryCall(ctx context.Context, method, path string, body interface{}, response interface{}) error {
	// Add Model Registry specific mock responses as needed
	return bffclient.NewNotFoundError(m.target, fmt.Sprintf("mock not implemented for %s %s", method, path))
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
	config  *bffclient.BFFClientConfig
	clients map[bffclient.BFFTarget]*MockBFFClient
	logger  *slog.Logger
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
	// Return cached client if exists
	if client, ok := f.clients[target]; ok {
		return client
	}

	// Create new mock client
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
func (f *MockClientFactory) IsTargetConfigured(target bffclient.BFFTarget) bool {
	return true
}

// GetMockClient returns the mock client for a specific target (for test assertions)
func (f *MockClientFactory) GetMockClient(target bffclient.BFFTarget) *MockBFFClient {
	return f.clients[target]
}

// NewMockClientFactoryWithConfig creates a new mock client factory with custom config
func NewMockClientFactoryWithConfig(config *bffclient.BFFClientConfig, rootCAs *x509.CertPool, insecureSkipVerify bool, logger *slog.Logger) bffclient.BFFClientFactory {
	return &MockClientFactory{
		config:  config,
		clients: make(map[bffclient.BFFTarget]*MockBFFClient),
		logger:  logger,
	}
}
