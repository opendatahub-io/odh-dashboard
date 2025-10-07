package maas

import (
	"context"

	"github.com/opendatahub-io/gen-ai/internal/models"
)

// MaaSClientInterface defines the interface for MaaS (Model as a Service) client operations
type MaaSClientInterface interface {
	ListModels(ctx context.Context) ([]models.MaaSModel, error)
	IssueToken(ctx context.Context, request models.MaaSTokenRequest) (*models.MaaSTokenResponse, error)
	RevokeAllTokens(ctx context.Context) error
}

// MaaSClientFactory interface for creating MaaS clients
type MaaSClientFactory interface {
	CreateClient(baseURL string, authToken string) MaaSClientInterface
}

// RealClientFactory creates real MaaS clients
type RealClientFactory struct{}

// NewRealClientFactory creates a factory for real MaaS clients
func NewRealClientFactory() MaaSClientFactory {
	return &RealClientFactory{}
}

// CreateClient creates a new real MaaS client with the given base URL and auth token
func (f *RealClientFactory) CreateClient(baseURL string, authToken string) MaaSClientInterface {
	return NewHTTPMaaSClient(baseURL, authToken)
}
