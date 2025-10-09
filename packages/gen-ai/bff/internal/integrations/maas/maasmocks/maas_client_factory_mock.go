package maasmocks

import (
	"crypto/x509"

	"github.com/opendatahub-io/gen-ai/internal/integrations/maas"
)

// MockClientFactory creates mock MaaS clients for testing
type MockClientFactory struct{}

// NewMockClientFactory creates a new mock client factory
func NewMockClientFactory() maas.MaaSClientFactory {
	return &MockClientFactory{}
}

// CreateClient creates a new mock MaaS client (ignores all parameters since it's a mock)
func (f *MockClientFactory) CreateClient(baseURL string, authToken string, insecureSkipVerify bool, rootCAs *x509.CertPool) maas.MaaSClientInterface {
	return NewMockMaaSClient()
}
