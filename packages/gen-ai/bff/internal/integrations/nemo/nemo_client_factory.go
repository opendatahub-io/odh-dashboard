package nemo

import (
	"context"
	"crypto/x509"
)

// NemoClientInterface defines the interface for NeMo Guardrails client operations
type NemoClientInterface interface {
	// CheckGuardrails sends content to the NeMo guardrail/checks endpoint.
	// opts must carry a fully inline config (model, rails, prompts).
	// role should be RoleUser for input moderation, RoleAssistant for output moderation.
	CheckGuardrails(ctx context.Context, input string, opts GuardrailsOptions, role string) (*GuardrailCheckResponse, error)
}

// NemoClientFactory creates NeMo Guardrails clients
type NemoClientFactory interface {
	CreateClient(baseURL string, authToken string, insecureSkipVerify bool, rootCAs *x509.CertPool) NemoClientInterface
}

// RealClientFactory creates real NeMo Guardrails clients
type RealClientFactory struct{}

// NewRealClientFactory creates a factory for real NeMo Guardrails clients
func NewRealClientFactory() NemoClientFactory {
	return &RealClientFactory{}
}

// CreateClient creates a new NeMo Guardrails client
func (f *RealClientFactory) CreateClient(baseURL string, authToken string, insecureSkipVerify bool, rootCAs *x509.CertPool) NemoClientInterface {
	return NewNemoGuardrailsClient(baseURL, authToken, insecureSkipVerify, rootCAs)
}
