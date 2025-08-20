package repositories

import (
	"context"

	"github.com/openai/openai-go/v2"
	"github.com/openai/openai-go/v2/responses"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/clients"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/interfaces"
)

// LlamaStackRepository provides a unified interface for all LlamaStack operations.
type LlamaStackRepository struct {
	client interfaces.LlamaStackClientInterface
}

// NewLlamaStackRepository creates a new unified LlamaStack repository.
func NewLlamaStackRepository(client interfaces.LlamaStackClientInterface) *LlamaStackRepository {
	return &LlamaStackRepository{
		client: client,
	}
}

// Models operations
func (r *LlamaStackRepository) ListModels(ctx context.Context) ([]openai.Model, error) {
	return r.client.ListModels(ctx)
}

// Vector Stores operations
func (r *LlamaStackRepository) ListVectorStores(ctx context.Context, params clients.ListVectorStoresParams) ([]openai.VectorStore, error) {
	return r.client.ListVectorStores(ctx, params)
}

func (r *LlamaStackRepository) CreateVectorStore(ctx context.Context, params clients.CreateVectorStoreParams) (*openai.VectorStore, error) {
	return r.client.CreateVectorStore(ctx, params)
}

// Files operations
func (r *LlamaStackRepository) UploadFile(ctx context.Context, params clients.UploadFileParams) (*clients.FileUploadResult, error) {
	return r.client.UploadFile(ctx, params)
}

// Responses operations
func (r *LlamaStackRepository) CreateResponse(ctx context.Context, params clients.CreateResponseParams) (*responses.Response, error) {
	return r.client.CreateResponse(ctx, params)
}
