package bffmocks

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"sync"

	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/bffclient"
)

// MockBFFClient provides a mock implementation of BFFClientInterface.
type MockBFFClient struct {
	target    bffclient.BFFTarget
	baseURL   string
	available bool

	// CallHandler lets tests override mock behaviour per call.
	CallHandler func(ctx context.Context, method, path string, body interface{}, response interface{}) error
}

func NewMockBFFClient(target bffclient.BFFTarget) *MockBFFClient {
	return &MockBFFClient{
		target:    target,
		baseURL:   fmt.Sprintf("http://mock-%s.test.svc.cluster.local:8080/api/v1", target),
		available: true,
	}
}

func (m *MockBFFClient) Call(ctx context.Context, method, path string, body interface{}, response interface{}) error {
	if m.CallHandler != nil {
		return m.CallHandler(ctx, method, path, body, response)
	}

	switch m.target {
	case bffclient.BFFTargetModelCatalog:
		return m.handleModelCatalogCall(method, path, response)
	default:
		return bffclient.NewNotFoundError(m.target, fmt.Sprintf("mock not implemented for target %s", m.target))
	}
}

func (m *MockBFFClient) handleModelCatalogCall(method, path string, response interface{}) error {
	if method != "GET" {
		return bffclient.NewBadRequestError(m.target, fmt.Sprintf("only GET is supported, got %s", method))
	}

	mockResp := map[string]interface{}{
		"data": map[string]interface{}{
			"nextPageToken": "",
			"pageSize":      10,
			"size":          1,
			"items": []map[string]interface{}{
				{
					"artifactType":         "metrics-artifact",
					"metricsType":          "security-metrics",
					"createTimeSinceEpoch": "1693526400000",
				},
			},
		},
	}
	return marshalToResponse(mockResp, response)
}

func marshalToResponse(data interface{}, response interface{}) error {
	if response == nil {
		return nil
	}
	b, err := json.Marshal(data)
	if err != nil {
		return err
	}
	return json.Unmarshal(b, response)
}

func (m *MockBFFClient) IsAvailable(_ context.Context) bool { return m.available }
func (m *MockBFFClient) GetBaseURL() string                 { return m.baseURL }
func (m *MockBFFClient) GetTarget() bffclient.BFFTarget     { return m.target }
func (m *MockBFFClient) SetAvailable(v bool)                { m.available = v }

// MockClientFactory creates mock BFF clients.
type MockClientFactory struct {
	config    *bffclient.BFFClientConfig
	clients   map[bffclient.BFFTarget]*MockBFFClient
	clientsMu sync.RWMutex
	logger    *slog.Logger
}

func NewMockClientFactory(logger *slog.Logger) bffclient.BFFClientFactory {
	config := bffclient.NewDefaultBFFClientConfig()
	config.MockBFFClients = true
	return &MockClientFactory{
		config:  config,
		clients: make(map[bffclient.BFFTarget]*MockBFFClient),
		logger:  logger,
	}
}

func (f *MockClientFactory) CreateClient(target bffclient.BFFTarget, _ string) bffclient.BFFClientInterface {
	f.clientsMu.RLock()
	if client, ok := f.clients[target]; ok {
		f.clientsMu.RUnlock()
		return client
	}
	f.clientsMu.RUnlock()

	f.clientsMu.Lock()
	defer f.clientsMu.Unlock()

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

func (f *MockClientFactory) GetConfig(target bffclient.BFFTarget) *bffclient.BFFServiceConfig {
	return f.config.GetServiceConfig(target)
}

func (f *MockClientFactory) IsTargetConfigured(_ bffclient.BFFTarget) bool { return true }

func (f *MockClientFactory) GetMockClient(target bffclient.BFFTarget) *MockBFFClient {
	f.clientsMu.RLock()
	defer f.clientsMu.RUnlock()
	return f.clients[target]
}
