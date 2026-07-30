package repositories

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/opendatahub-io/maas-library/bff/internal/integrations/maas"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

// APIKeysRepository handles API key operations.
type APIKeysRepository struct {
	logger     *slog.Logger
	maasClient *maas.MaasClient
}

// NewAPIKeysRepository creates a new API keys repository.
// An empty maasApiUrl is allowed; the underlying MaasClient can be configured later via SetMaasApiURL.
func NewAPIKeysRepository(logger *slog.Logger, maasApiUrl string) (*APIKeysRepository, error) {
	client, err := maas.NewMaasClient(logger, maasApiUrl)
	if err != nil {
		return nil, err
	}
	return &APIKeysRepository{
		logger:     logger,
		maasClient: client,
	}, nil
}

// SetMaasApiURL configures the upstream maas-api base URL on the shared client.
func (r *APIKeysRepository) SetMaasApiURL(maasApiUrl string) error {
	return r.maasClient.SetBaseURL(maasApiUrl)
}

// Ready reports whether the upstream maas-api client has a configured base URL.
func (r *APIKeysRepository) Ready() bool {
	return r.maasClient != nil && r.maasClient.Ready()
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
	r.logger.Debug("Bulk revoking API keys")

	return r.maasClient.BulkRevokeAPIKeys(ctx, request)
}

// ListSubscriptionsForApiKeys returns the list of subscriptions available to the authenticated user for API key creation.
func (r *APIKeysRepository) ListSubscriptionsForApiKeys(ctx context.Context) ([]models.SubscriptionListItem, error) {
	r.logger.Debug("Listing subscriptions for API key creation")

	items, err := r.maasClient.ListSubscriptionsForApiKeys(ctx)
	if err != nil {
		return nil, fmt.Errorf("list subscriptions via maas-api: %w", err)
	}

	return items, nil
}

// GetSubscriptionForApiKeys returns a single subscription by subscription_id_header for the authenticated user.
// Returns nil, nil when the subscription does not exist or the user has no access.
func (r *APIKeysRepository) GetSingleUserSubscription(ctx context.Context, id string) (*models.SubscriptionListItem, error) {
	r.logger.Debug("Getting subscription for API key creation", slog.String("id", id))

	item, err := r.maasClient.GetSingleUserSubscription(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("get subscription via maas-api: %w", err)
	}

	return item, nil
}
