package ehmocks

import (
	"crypto/x509"

	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/evalhub"
)

// MockClientFactory creates mock EvalHub clients for development and testing.
type MockClientFactory struct {
	mockClient evalhub.EvalHubClientInterface
}

func NewMockClientFactory() *MockClientFactory {
	return &MockClientFactory{}
}

func (f *MockClientFactory) SetMockClient(client evalhub.EvalHubClientInterface) {
	f.mockClient = client
}

func (f *MockClientFactory) CreateClient(baseURL, authToken string, insecureSkipVerify bool, rootCAs *x509.CertPool, apiPath string) evalhub.EvalHubClientInterface {
	if f.mockClient != nil {
		return f.mockClient
	}
	return NewMockEvalHubClient()
}
