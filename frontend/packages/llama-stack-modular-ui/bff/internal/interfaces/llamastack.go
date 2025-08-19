package interfaces

import (
	"context"

	"github.com/openai/openai-go/v2"
	"github.com/openai/openai-go/v2/responses"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/clients"
)

// LlamaStackClientInterface defines the interface that both real and mock clients must implement
type LlamaStackClientInterface interface {
	ListModels(ctx context.Context) ([]openai.Model, error)

	ListVectorStores(ctx context.Context, params clients.ListVectorStoresParams) ([]openai.VectorStore, error)
	CreateVectorStore(ctx context.Context, params clients.CreateVectorStoreParams) (*openai.VectorStore, error)

	// UploadFile uploads a file and optionally adds it to a vector store in one operation
	UploadFile(ctx context.Context, params clients.UploadFileParams) (*clients.FileUploadResult, error)

	CreateResponse(ctx context.Context, params clients.CreateResponseParams) (*responses.Response, error)
	GetResponse(ctx context.Context, responseID string) (*responses.Response, error)
}
