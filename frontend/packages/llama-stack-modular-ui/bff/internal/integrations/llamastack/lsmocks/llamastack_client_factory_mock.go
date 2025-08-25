package lsmocks

import (
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/integrations/llamastack"
)

// MockClientFactory creates mock LlamaStack clients following the model registry pattern
type MockClientFactory struct{}

// NewMockClientFactory creates a factory for mock LlamaStack clients
func NewMockClientFactory() llamastack.LlamaStackClientFactory {
	return &MockClientFactory{}
}

// CreateClient creates a new mock LlamaStack client (ignores baseURL for mocks)
func (f *MockClientFactory) CreateClient(baseURL string) llamastack.LlamaStackClientInterface {
	return NewMockLlamaStackClient()
}
