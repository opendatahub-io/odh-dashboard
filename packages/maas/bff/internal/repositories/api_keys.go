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
func (r *APIKeysRepository) CreateAPIKey(ctx context.Context, request models.APIKeyCreateRequest) (*models.APIKeyCreateResponse, error) {
	r.logger.Debug("Creating API key", slog.String("name", request.Name))

	return r.maasClient.CreateAPIKey(ctx, request)
}

// SearchAPIKeys searches API keys with filters, sorting, and pagination
func (r *APIKeysRepository) SearchAPIKeys(ctx context.Context, request models.APIKeySearchRequest) (*models.APIKeyListResponse, error) {
	r.logger.Debug("Searching API keys")

	return r.maasClient.SearchAPIKeys(ctx, request)
}

// GetAPIKey retrieves an API key by ID
func (r *APIKeysRepository) GetAPIKey(ctx context.Context, id string) (*models.APIKey, error) {
	r.logger.Debug("Getting API key", slog.String("id", id))

	return r.maasClient.GetAPIKey(ctx, id)
}

// RevokeAPIKey revokes a specific API key by ID
func (r *APIKeysRepository) RevokeAPIKey(ctx context.Context, id string) (*models.APIKey, error) {
	r.logger.Debug("Revoking API key", slog.String("id", id))

	return r.maasClient.RevokeAPIKey(ctx, id)
}

// BulkRevokeAPIKeys revokes all active API keys for a specific user
func (r *APIKeysRepository) BulkRevokeAPIKeys(ctx context.Context, request models.APIKeyBulkRevokeRequest) (*models.APIKeyBulkRevokeResponse, error) {
	r.logger.Debug("Bulk revoking API keys", slog.String("username", request.Username))

	return r.maasClient.BulkRevokeAPIKeys(ctx, request)
}
