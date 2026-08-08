package repositories

import (
	"context"

	"github.com/openai/openai-go/v2"
	helper "github.com/opendatahub-io/gen-ai/internal/helpers"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack"
)

// ModelsRepository handles model-related operations and data transformations.
type ModelsRepository struct {
	// No fields needed - factory and URL come from context
}

// NewModelsRepository creates a new models repository.
func NewModelsRepository() *ModelsRepository {
	return &ModelsRepository{}
}

// ListModels retrieves all available models and transforms them for BFF use.
// The LlamaStack client is expected to be in the context (created by AttachOGXClient middleware).
func (r *ModelsRepository) ListModels(ctx context.Context) ([]openai.Model, error) {
	return r.ListModelsWithProviderData(ctx, nil)
}

// ListModelsWithProviderData retrieves models forwarding provider data as X-OGX-Provider-Data.
func (r *ModelsRepository) ListModelsWithProviderData(ctx context.Context, providerData map[string]any) ([]openai.Model, error) {
	client, err := helper.GetContextLlamaStackClient(ctx)
	if err != nil {
		return nil, err
	}
	lsClient, ok := client.(*llamastack.LlamaStackClient)
	if !ok {
		// Mock or other client — fall back to standard ListModels
		return client.ListModels(ctx)
	}
	return lsClient.ListModelsWithProviderData(ctx, providerData)
}
