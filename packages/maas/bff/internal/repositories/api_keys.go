package repositories

import (
	"log/slog"

	"github.com/opendatahub-io/maas-library/bff/internal/mocks"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

// APIKeysRepository handles API key operations.
// Currently returns mock data to unblock UI development.
// TODO: Add real MaaS API integration when available.
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
func (r *APIKeysRepository) CreateAPIKey(request models.APIKeyRequest) (*models.APIKeyResponse, error) {
	r.logger.Debug("Creating API key", slog.String("name", request.Name))

	response := mocks.GetMockAPIKeyResponse()
	return &response, nil
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
func (r *APIKeysRepository) DeleteAllAPIKeys() error {
	r.logger.Debug("Deleting all API keys")

	return nil
}
