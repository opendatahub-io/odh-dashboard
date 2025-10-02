package llamastack

import (
	"context"

	"github.com/openai/openai-go/v2"
	"github.com/openai/openai-go/v2/packages/ssestream"
	"github.com/openai/openai-go/v2/responses"
)

// LlamaStackClientInterface defines the interface for LlamaStack client operations
type LlamaStackClientInterface interface {
	ListModels(ctx context.Context) ([]openai.Model, error)
	ListVectorStores(ctx context.Context, params ListVectorStoresParams) ([]openai.VectorStore, error)
	CreateVectorStore(ctx context.Context, params CreateVectorStoreParams) (*openai.VectorStore, error)
	DeleteVectorStore(ctx context.Context, vectorStoreID string) error
	UploadFile(ctx context.Context, params UploadFileParams) (*FileUploadResult, error)
	ListFiles(ctx context.Context, params ListFilesParams) ([]openai.FileObject, error)
	GetFile(ctx context.Context, fileID string) (*openai.FileObject, error)
	DeleteFile(ctx context.Context, fileID string) error
	ListVectorStoreFiles(ctx context.Context, vectorStoreID string, params ListVectorStoreFilesParams) ([]openai.VectorStoreFile, error)
	DeleteVectorStoreFile(ctx context.Context, vectorStoreID, fileID string) error
	CreateResponse(ctx context.Context, params CreateResponseParams) (*responses.Response, error)
	CreateResponseStream(ctx context.Context, params CreateResponseParams) (*ssestream.Stream[responses.ResponseStreamEventUnion], error)
	GetResponse(ctx context.Context, responseID string) (*responses.Response, error)
}

// LlamaStackClientFactory interface for creating LlamaStack clients
type LlamaStackClientFactory interface {
	CreateClient(baseURL string) LlamaStackClientInterface
}

// RealClientFactory creates real LlamaStack clients
type RealClientFactory struct{}

// NewRealClientFactory creates a factory for real LlamaStack clients
func NewRealClientFactory() LlamaStackClientFactory {
	return &RealClientFactory{}
}

// CreateClient creates a new real LlamaStack client with the given base URL
func (f *RealClientFactory) CreateClient(baseURL string) LlamaStackClientInterface {
	return NewLlamaStackClient(baseURL)
}
