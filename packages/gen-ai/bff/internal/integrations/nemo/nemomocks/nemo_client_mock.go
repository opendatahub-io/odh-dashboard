package nemomocks

import (
	"context"
	"crypto/x509"

	nemopkg "github.com/opendatahub-io/gen-ai/internal/integrations/nemo"
)

// MockNemoClient provides a configurable mock implementation of NemoClientInterface for testing.
type MockNemoClient struct {
	CheckGuardrailsFunc func(ctx context.Context, input string, opts nemopkg.GuardrailsOptions, role string) (*nemopkg.GuardrailCheckResponse, error)
}

// NewMockNemoClient creates a mock that returns success (not flagged) by default.
func NewMockNemoClient() *MockNemoClient {
	return &MockNemoClient{
		CheckGuardrailsFunc: func(_ context.Context, _ string, _ nemopkg.GuardrailsOptions, _ string) (*nemopkg.GuardrailCheckResponse, error) {
			return &nemopkg.GuardrailCheckResponse{Status: nemopkg.StatusSuccess}, nil
		},
	}
}

// CheckGuardrails delegates to CheckGuardrailsFunc, allowing per-test overrides.
func (m *MockNemoClient) CheckGuardrails(ctx context.Context, input string, opts nemopkg.GuardrailsOptions, role string) (*nemopkg.GuardrailCheckResponse, error) {
	return m.CheckGuardrailsFunc(ctx, input, opts, role)
}

// MockClientFactory creates MockNemoClient instances.
type MockClientFactory struct{}

// NewMockClientFactory returns a NemoClientFactory that produces mock clients.
func NewMockClientFactory() nemopkg.NemoClientFactory {
	return &MockClientFactory{}
}

// CreateClient returns a new MockNemoClient (parameters are ignored in mock mode).
func (f *MockClientFactory) CreateClient(_ string, _ string, _ bool, _ *x509.CertPool) nemopkg.NemoClientInterface {
	return NewMockNemoClient()
}
