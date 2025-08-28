package repositories

import (
	"context"

	"github.com/openai/openai-go/v2"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/integrations/llamastack"
)

// ModelsRepository handles model-related operations and data transformations.
type ModelsRepository struct {
	client llamastack.LlamaStackClientInterface
}

// NewModelsRepository creates a new models repository.
func NewModelsRepository(client llamastack.LlamaStackClientInterface) *ModelsRepository {
	return &ModelsRepository{
		client: client,
	}
}

// ListModels retrieves all available models and transforms them for BFF use.
func (r *ModelsRepository) ListModels(ctx context.Context) ([]openai.Model, error) {
	// Repository layer can add transformation logic here if needed
	// For now, direct passthrough from client to handler
	return r.client.ListModels(ctx)
}
