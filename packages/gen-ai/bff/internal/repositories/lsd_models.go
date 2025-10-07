package repositories

import (
	"context"

	"github.com/openai/openai-go/v2"
	helper "github.com/opendatahub-io/gen-ai/internal/helpers"
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
// The LlamaStack client is expected to be in the context (created by AttachLlamaStackClient middleware).
func (r *ModelsRepository) ListModels(ctx context.Context) ([]openai.Model, error) {
	// Get ready-to-use LlamaStack client from context using helper
	client, err := helper.GetContextLlamaStackClient(ctx)
	if err != nil {
		return nil, err
	}

	// Repository layer can add transformation logic here if needed
	// For now, direct passthrough from client to handler
	return client.ListModels(ctx)
}
