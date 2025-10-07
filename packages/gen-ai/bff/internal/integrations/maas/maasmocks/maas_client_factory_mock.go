package maasmocks

import "github.com/opendatahub-io/gen-ai/internal/integrations/maas"

// MockClientFactory creates mock MaaS clients for testing
type MockClientFactory struct{}

// NewMockClientFactory creates a new mock client factory
func NewMockClientFactory() maas.MaaSClientFactory {
	return &MockClientFactory{}
}

// CreateClient creates a new mock MaaS client (ignores baseURL and authToken since it's a mock)
func (f *MockClientFactory) CreateClient(baseURL string, authToken string) maas.MaaSClientInterface {
	return NewMockMaaSClient()
}
