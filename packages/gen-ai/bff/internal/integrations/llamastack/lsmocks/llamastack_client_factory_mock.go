package lsmocks

import (
	"crypto/x509"
	"sync"

	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack"
	"github.com/opendatahub-io/gen-ai/internal/testutil"
)

// MockClientFactory creates LlamaStack clients pointing to a local Llama Stack instance.
// Unlike the previous mock that returned fake in-memory data, this connects to a real
// local Llama Stack server started via uv, matching the MLflow envtest philosophy.
type MockClientFactory struct {
	client llamastack.LlamaStackClientInterface
	mu     sync.Mutex
}

// NewMockClientFactory creates a factory that connects to local Llama Stack.
func NewMockClientFactory() llamastack.LlamaStackClientFactory {
	return &MockClientFactory{}
}

// CreateClient returns a shared LlamaStack client connected to the local instance.
// The baseURL, authToken, and other params are ignored — the local server URL is used instead.
func (f *MockClientFactory) CreateClient(_ string, _ string, _ bool, _ *x509.CertPool, _ string) llamastack.LlamaStackClientInterface {
	f.mu.Lock()
	defer f.mu.Unlock()

	if f.client != nil {
		return f.client
	}

	f.client = NewTestLlamaStackClient(testutil.GetTestLlamaStackURL(), llamaStackTestID())
	return f.client
}
