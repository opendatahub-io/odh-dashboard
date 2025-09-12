package repositories

import (
	"context"

	"github.com/openai/openai-go/v2"
	helper "github.com/opendatahub-io/gen-ai/internal/helpers"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack"
)

// VectorStoresRepository handles vector store operations and data transformations.
type VectorStoresRepository struct {
	// No fields needed - factory and URL come from context
}

// NewVectorStoresRepository creates a new vector stores repository.
func NewVectorStoresRepository() *VectorStoresRepository {
	return &VectorStoresRepository{}
}

// ListVectorStores retrieves vector stores with optional filtering and transforms them for BFF use.
// The LlamaStack client is expected to be in the context (created by AttachLlamaStackClient middleware).
func (r *VectorStoresRepository) ListVectorStores(ctx context.Context, params llamastack.ListVectorStoresParams) ([]openai.VectorStore, error) {
	// Get ready-to-use LlamaStack client from context using helper
	client, err := helper.GetContextLlamaStackClient(ctx)
	if err != nil {
		return nil, err
	}

	// Repository layer can add transformation logic here if needed
	// For now, direct passthrough from client to handler
	return client.ListVectorStores(ctx, params)
}

// CreateVectorStore creates a new vector store and transforms the result for BFF use.
// The LlamaStack client is expected to be in the context (created by AttachLlamaStackClient middleware).
func (r *VectorStoresRepository) CreateVectorStore(ctx context.Context, params llamastack.CreateVectorStoreParams) (*openai.VectorStore, error) {
	// Get ready-to-use LlamaStack client from context using helper
	client, err := helper.GetContextLlamaStackClient(ctx)
	if err != nil {
		return nil, err
	}

	// Repository layer can add transformation logic here if needed
	// For now, direct passthrough from client to handler
	return client.CreateVectorStore(ctx, params)
}
