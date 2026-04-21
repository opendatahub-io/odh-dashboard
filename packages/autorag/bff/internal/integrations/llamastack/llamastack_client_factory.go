package llamastack

import (
	"context"
	"crypto/x509"

	"github.com/opendatahub-io/autorag-library/bff/internal/models"
)

// LlamaStackClientInterface defines the interface for LlamaStack client operations
type LlamaStackClientInterface interface {
	ListModels(ctx context.Context) ([]models.LlamaStackNativeModel, error)
	ListProviders(ctx context.Context) ([]models.LlamaStackProvider, error)
}

// LlamaStackClientFactory interface for creating LlamaStack clients
type LlamaStackClientFactory interface {
	CreateClient(baseURL string, authToken string, insecureSkipVerify bool, rootCAs *x509.CertPool) LlamaStackClientInterface
}

// RealClientFactory creates real LlamaStack clients
type RealClientFactory struct{}

// NewRealClientFactory creates a factory for real LlamaStack clients
func NewRealClientFactory() LlamaStackClientFactory {
	return &RealClientFactory{}
}

// CreateClient creates a new real LlamaStack client with the given parameters
func (f *RealClientFactory) CreateClient(baseURL string, authToken string, insecureSkipVerify bool, rootCAs *x509.CertPool) LlamaStackClientInterface {
	return NewLlamaStackClient(baseURL, authToken, insecureSkipVerify, rootCAs)
}
