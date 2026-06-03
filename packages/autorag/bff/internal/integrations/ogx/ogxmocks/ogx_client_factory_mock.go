package ogxmocks

import (
	"crypto/x509"

	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/ogx"
)

// MockClientFactory creates mock Open GenAI Stack clients for testing
type MockClientFactory struct {
	mockClient ogx.OGXClientInterface
}

// Ensure MockClientFactory implements the interface
var _ ogx.OGXClientFactory = (*MockClientFactory)(nil)

// NewMockClientFactory creates a factory for mock Open GenAI Stack clients
func NewMockClientFactory() ogx.OGXClientFactory {
	return &MockClientFactory{}
}

// SetMockClient sets a specific mock client to be returned by CreateClient
func (f *MockClientFactory) SetMockClient(client ogx.OGXClientInterface) {
	f.mockClient = client
}

// CreateClient creates a new mock Open GenAI Stack client (ignores all parameters since it's a mock)
func (f *MockClientFactory) CreateClient(baseURL string, authToken string, insecureSkipVerify bool, rootCAs *x509.CertPool) ogx.OGXClientInterface {
	if f.mockClient != nil {
		return f.mockClient
	}
	return NewMockOGXClient()
}
