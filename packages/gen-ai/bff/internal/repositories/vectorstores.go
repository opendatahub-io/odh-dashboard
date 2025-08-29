package repositories

import (
	"context"

	"github.com/openai/openai-go/v2"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack"
)

// VectorStoresRepository handles vector store operations and data transformations.
type VectorStoresRepository struct {
	client llamastack.LlamaStackClientInterface
}

// NewVectorStoresRepository creates a new vector stores repository.
func NewVectorStoresRepository(client llamastack.LlamaStackClientInterface) *VectorStoresRepository {
	return &VectorStoresRepository{
		client: client,
	}
}

// ListVectorStores retrieves vector stores with optional filtering and transforms them for BFF use.
func (r *VectorStoresRepository) ListVectorStores(ctx context.Context, params llamastack.ListVectorStoresParams) ([]openai.VectorStore, error) {
	// Repository layer can add transformation logic here if needed
	// For now, direct passthrough from client to handler
	return r.client.ListVectorStores(ctx, params)
}

// CreateVectorStore creates a new vector store and transforms the result for BFF use.
func (r *VectorStoresRepository) CreateVectorStore(ctx context.Context, params llamastack.CreateVectorStoreParams) (*openai.VectorStore, error) {
	// Repository layer can add transformation logic here if needed
	// For now, direct passthrough from client to handler
	return r.client.CreateVectorStore(ctx, params)
}
