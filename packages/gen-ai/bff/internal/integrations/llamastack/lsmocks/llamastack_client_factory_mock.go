package lsmocks

import (
	"crypto/x509"
	"os"

	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack"
)

// MockClientFactory creates LlamaStack clients for mock mode.
// It auto-detects the environment: when TEST_LLAMA_STACK_PORT is set (e.g., during
// make test), it connects to the real local Llama Stack server. Otherwise, it falls
// back to an in-memory mock client with hardcoded fake data — enabling contract tests,
// Cypress tests, and local dev to run without a server.
type MockClientFactory struct{}

// NewMockClientFactory creates a mock factory that auto-detects the environment.
func NewMockClientFactory() llamastack.LlamaStackClientFactory {
	return &MockClientFactory{}
}

// CreateClient returns a real test client if TEST_LLAMA_STACK_PORT is set,
// otherwise falls back to an in-memory mock.
func (f *MockClientFactory) CreateClient(_ string, _ string, _ bool, _ *x509.CertPool, _ string) llamastack.LlamaStackClientInterface {
	if client := TryCreateTestClient(); client != nil {
		return client
	}
	return NewMockLlamaStackClient()
}

// TryCreateTestClient returns a TestLlamaStackClient connected to a local server
// if the required env vars are set (e.g., during make test), or nil if unavailable
// (e.g., during contract tests or CI without a server).
func TryCreateTestClient() llamastack.LlamaStackClientInterface {
	port := os.Getenv("TEST_LLAMA_STACK_PORT")
	if port == "" {
		return nil
	}
	url := "http://127.0.0.1:" + port
	testID := os.Getenv("LLAMA_STACK_TEST_ID")
	if testID == "" {
		testID = "test"
	}
	return NewTestLlamaStackClient(url, testID)
}
