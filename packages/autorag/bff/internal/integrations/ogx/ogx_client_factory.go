package ogx

import (
	"context"
	"crypto/x509"

	"github.com/opendatahub-io/autorag-library/bff/internal/models"
)

// OGXClientInterface defines the interface for Open GenAI Stack client operations
type OGXClientInterface interface {
	ListModels(ctx context.Context) ([]models.OGXNativeModel, error)
	ListProviders(ctx context.Context) ([]models.OGXProvider, error)
}

// OGXClientFactory interface for creating Open GenAI Stack clients
type OGXClientFactory interface {
	CreateClient(baseURL string, authToken string, insecureSkipVerify bool, rootCAs *x509.CertPool) OGXClientInterface
}

// RealClientFactory creates real Open GenAI Stack clients
type RealClientFactory struct{}

// NewRealClientFactory creates a factory for real Open GenAI Stack clients
func NewRealClientFactory() OGXClientFactory {
	return &RealClientFactory{}
}

// CreateClient creates a new real Open GenAI Stack client with the given parameters
func (f *RealClientFactory) CreateClient(baseURL string, authToken string, insecureSkipVerify bool, rootCAs *x509.CertPool) OGXClientInterface {
	return NewOGXClient(baseURL, authToken, insecureSkipVerify, rootCAs)
}
