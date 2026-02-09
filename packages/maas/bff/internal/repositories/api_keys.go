package repositories

import (
	"context"
	"log/slog"
	"net/url"

	"github.com/opendatahub-io/maas-library/bff/internal/integrations/maas"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

// APIKeysRepository handles API key operations.
type APIKeysRepository struct {
	logger     *slog.Logger
	maasClient *maas.MaasClient
}

// NewAPIKeysRepository creates a new API keys repository
func NewAPIKeysRepository(logger *slog.Logger, maasApiUrl string) (*APIKeysRepository, error) {
	parsedApiUrl, err := url.Parse(maasApiUrl)
	if err != nil {
		return nil, err
	}

	return &APIKeysRepository{
		logger:     logger,
		maasClient: maas.NewMaasClient(logger, parsedApiUrl),
	}, nil
}

// CreateAPIKey creates a new API key
func (r *APIKeysRepository) CreateAPIKey(ctx context.Context, request models.APIKeyRequest) (*models.APIKeyResponse, error) {
	r.logger.Debug("Creating API key", slog.String("name", request.Name))

	return r.maasClient.CreateAPIKey(ctx, request)
}

// GetAPIKey retrieves an API key by ID
func (r *APIKeysRepository) GetAPIKey(ctx context.Context, id string) (*models.APIKeyMetadata, error) {
	r.logger.Debug("Getting API key", slog.String("id", id))

	return r.maasClient.GetAPIKey(ctx, id)
}

// ListAPIKeys retrieves all API keys
func (r *APIKeysRepository) ListAPIKeys(ctx context.Context) ([]models.APIKeyMetadata, error) {
	r.logger.Debug("Listing API keys")

	return r.maasClient.ListAPIKeys(ctx)
}

// DeleteAllAPIKeys removes all API keys
func (r *APIKeysRepository) DeleteAllAPIKeys() error {
	r.logger.Debug("Deleting all API keys")

	return nil
}
