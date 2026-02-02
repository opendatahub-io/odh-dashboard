package repositories

import (
	"context"
	"log/slog"

	helper "github.com/opendatahub-io/maas-library/bff/internal/helpers"
	"github.com/opendatahub-io/maas-library/bff/internal/mocks"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

// APIKeysRepository handles API key operations.
type APIKeysRepository struct {
	logger *slog.Logger
}

// NewAPIKeysRepository creates a new API keys repository
func NewAPIKeysRepository(logger *slog.Logger) *APIKeysRepository {
	return &APIKeysRepository{
		logger: logger,
	}
}

// CreateAPIKey creates a new API key
// Maps to POST /v1/tokens in MaaS API (ephemeral tokens) or /v1/api-keys (named keys)
// The gen-ai port used POST /v1/tokens (IssueToken)
func (r *APIKeysRepository) CreateAPIKey(ctx context.Context, request models.APIKeyRequest) (*models.APIKeyResponse, error) {
	r.logger.Debug("Creating API key", slog.String("name", request.Name))

	client, err := helper.GetContextMaaSClient(ctx)
	if err != nil {
		return nil, err
	}

	return client.IssueToken(ctx, request)
}

// GetAPIKey retrieves an API key by ID
func (r *APIKeysRepository) GetAPIKey(id string) (*models.APIKeyMetadata, error) {
	r.logger.Debug("Getting API key", slog.String("id", id))

	metadata := mocks.GetMockAPIKeyMetadata()
	metadata.ID = id
	return &metadata, nil
}

// ListAPIKeys retrieves all API keys
func (r *APIKeysRepository) ListAPIKeys() ([]models.APIKeyMetadata, error) {
	r.logger.Debug("Listing API keys")

	return mocks.GetMockAPIKeyMetadataList(), nil
}

// DeleteAllAPIKeys removes all API keys
func (r *APIKeysRepository) DeleteAllAPIKeys(ctx context.Context) error {
	r.logger.Debug("Deleting all API keys")

	client, err := helper.GetContextMaaSClient(ctx)
	if err != nil {
		return err
	}

	return client.RevokeAllTokens(ctx)
}
