package repositories

import (
	"context"

	helper "github.com/opendatahub-io/gen-ai/internal/helpers"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

// MaaSModelsRepository handles MaaS model-related operations and data transformations.
type MaaSModelsRepository struct {
	// No fields needed - factory and URL come from context
}

// NewMaaSModelsRepository creates a new MaaS models repository.
func NewMaaSModelsRepository() *MaaSModelsRepository {
	return &MaaSModelsRepository{}
}

// ListModels retrieves all available MaaS models and transforms them for BFF use.
// The MaaS client is expected to be in the context (created by AttachMaaSClient middleware).
// authToken is a bearer token — either the user's OIDC token (for direct auth) or a MaaS API key.
func (r *MaaSModelsRepository) ListModels(ctx context.Context, authToken string) ([]models.MaaSModel, error) {
	client, err := helper.GetContextMaaSClient(ctx)
	if err != nil {
		return nil, err
	}

	return client.ListModels(ctx, authToken)
}

// IssueToken creates a new ephemeral token with specified TTL.
// The MaaS client is expected to be in the context (created by AttachMaaSClient middleware).
// NOTE: This method is deprecated and will be removed once all LlamaStack paths
// (POST /api/v1/lsd/responses, POST /api/v1/lsd/install) are migrated to use inter-BFF communication.
func (r *MaaSModelsRepository) IssueToken(ctx context.Context, request models.MaaSTokenRequest) (*models.MaaSTokenResponse, error) {
	// Get ready-to-use MaaS client from context using helper
	client, err := helper.GetContextMaaSClient(ctx)
	if err != nil {
		return nil, err
	}

	// Repository layer can add validation logic here if needed
	// For now, direct passthrough from client to handler
	return client.IssueToken(ctx, request)
}
