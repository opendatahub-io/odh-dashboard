package lsmocks

import (
	"crypto/x509"

	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/llamastack"
)

// MockClientFactory creates mock LlamaStack clients for testing
type MockClientFactory struct {
	mockClient llamastack.LlamaStackClientInterface
}

// Ensure MockClientFactory implements the interface
var _ llamastack.LlamaStackClientFactory = (*MockClientFactory)(nil)

// NewMockClientFactory creates a factory for mock LlamaStack clients
func NewMockClientFactory() llamastack.LlamaStackClientFactory {
	return &MockClientFactory{}
}

// SetMockClient sets a specific mock client to be returned by CreateClient
func (f *MockClientFactory) SetMockClient(client llamastack.LlamaStackClientInterface) {
	f.mockClient = client
}

// CreateClient creates a new mock LlamaStack client (ignores all parameters since it's a mock)
func (f *MockClientFactory) CreateClient(baseURL string, authToken string, insecureSkipVerify bool, rootCAs *x509.CertPool, apiPath string) llamastack.LlamaStackClientInterface {
	if f.mockClient != nil {
		return f.mockClient
	}
	return NewMockLlamaStackClient()
}
