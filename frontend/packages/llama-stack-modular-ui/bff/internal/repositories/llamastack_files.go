package repositories

import (
	"context"

	"github.com/opendatahub-io/llama-stack-modular-ui/internal/clients"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/interfaces"
)

// LlamaStackFilesInterface defines the interface for file operations using OpenAI SDK
type LlamaStackFilesInterface interface {
	UploadFile(ctx context.Context, params clients.UploadFileParams) (*clients.FileUploadResult, error)
}

type LlamaStackFiles struct {
	client interfaces.LlamaStackClientInterface
}

func NewLlamaStackFiles(client interfaces.LlamaStackClientInterface) *LlamaStackFiles {
	return &LlamaStackFiles{
		client: client,
	}
}

func (f *LlamaStackFiles) UploadFile(ctx context.Context, params clients.UploadFileParams) (*clients.FileUploadResult, error) {
	return f.client.UploadFile(ctx, params)
}
