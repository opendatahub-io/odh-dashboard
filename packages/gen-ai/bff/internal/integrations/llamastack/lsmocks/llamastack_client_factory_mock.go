package lsmocks

import (
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack"
)

// MockClientFactory creates mock LlamaStack clients following the model registry pattern
type MockClientFactory struct {
	mockClient *MockLlamaStackClient
}

// NewMockClientFactory creates a factory for mock LlamaStack clients
func NewMockClientFactory() *MockClientFactory {
	return &MockClientFactory{}
}

// SetMockClient sets a specific mock client to be returned by CreateClient
func (f *MockClientFactory) SetMockClient(client *MockLlamaStackClient) {
	f.mockClient = client
}

// CreateClient creates a new mock LlamaStack client (ignores baseURL for mocks)
func (f *MockClientFactory) CreateClient(baseURL string) llamastack.LlamaStackClientInterface {
	if f.mockClient != nil {
		return f.mockClient
	}
	return NewMockLlamaStackClient()
}
