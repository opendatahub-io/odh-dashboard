package repositories

import (
	"context"

	"github.com/openai/openai-go/v2"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/clients"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/interfaces"
)

// LlamaStackVectorStoresInterface defines the interface for vector store operations using OpenAI SDK
type LlamaStackVectorStoresInterface interface {
	ListVectorStores(ctx context.Context, params clients.ListVectorStoresParams) ([]openai.VectorStore, error)
	CreateVectorStore(ctx context.Context, params clients.CreateVectorStoreParams) (*openai.VectorStore, error)
}

type LlamaStackVectorStores struct {
	client interfaces.LlamaStackClientInterface
}

func NewLlamaStackVectorStores(client interfaces.LlamaStackClientInterface) *LlamaStackVectorStores {
	return &LlamaStackVectorStores{
		client: client,
	}
}

func (v *LlamaStackVectorStores) ListVectorStores(ctx context.Context, params clients.ListVectorStoresParams) ([]openai.VectorStore, error) {
	return v.client.ListVectorStores(ctx, params)
}

func (v *LlamaStackVectorStores) CreateVectorStore(ctx context.Context, params clients.CreateVectorStoreParams) (*openai.VectorStore, error) {
	return v.client.CreateVectorStore(ctx, params)
}
