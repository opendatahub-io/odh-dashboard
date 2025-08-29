package repositories

import (
	"context"

	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack"
)

// FilesRepository handles file upload operations and data transformations.
type FilesRepository struct {
	client llamastack.LlamaStackClientInterface
}

// NewFilesRepository creates a new files repository.
func NewFilesRepository(client llamastack.LlamaStackClientInterface) *FilesRepository {
	return &FilesRepository{
		client: client,
	}
}

// UploadFile uploads a file and adds it to a vector store, transforming the result for BFF use.
func (r *FilesRepository) UploadFile(ctx context.Context, params llamastack.UploadFileParams) (*llamastack.FileUploadResult, error) {
	// Repository layer can add transformation logic here if needed
	// For now, direct passthrough from client to handler
	return r.client.UploadFile(ctx, params)
}
