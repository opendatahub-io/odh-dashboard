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
func (r *MaaSModelsRepository) ListModels(ctx context.Context) ([]models.MaaSModel, error) {
	// Get ready-to-use MaaS client from context using helper
	client, err := helper.GetContextMaaSClient(ctx)
	if err != nil {
		return nil, err
	}

	// Repository layer can add transformation logic here if needed
	// For now, direct passthrough from client to handler
	return client.ListModels(ctx)
}

// IssueToken creates a new ephemeral token with specified TTL.
// The MaaS client is expected to be in the context (created by AttachMaaSClient middleware).
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

// RevokeAllTokens invalidates all tokens for the current user.
// The MaaS client is expected to be in the context (created by AttachMaaSClient middleware).
func (r *MaaSModelsRepository) RevokeAllTokens(ctx context.Context) error {
	// Get ready-to-use MaaS client from context using helper
	client, err := helper.GetContextMaaSClient(ctx)
	if err != nil {
		return err
	}

	// Repository layer can add logging/audit logic here if needed
	// For now, direct passthrough from client to handler
	return client.RevokeAllTokens(ctx)
}
