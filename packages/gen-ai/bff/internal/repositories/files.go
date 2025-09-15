package repositories

import (
	"context"

	helper "github.com/opendatahub-io/gen-ai/internal/helpers"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack"
)

// FilesRepository handles file upload operations and data transformations.
type FilesRepository struct {
	// No fields needed - factory and URL come from context
}

// NewFilesRepository creates a new files repository.
func NewFilesRepository() *FilesRepository {
	return &FilesRepository{}
}

// UploadFile uploads a file and adds it to a vector store, transforming the result for BFF use.
// The LlamaStack client is expected to be in the context (created by AttachLlamaStackClient middleware).
func (r *FilesRepository) UploadFile(ctx context.Context, params llamastack.UploadFileParams) (*llamastack.FileUploadResult, error) {
	// Get ready-to-use LlamaStack client from context using helper
	client, err := helper.GetContextLlamaStackClient(ctx)
	if err != nil {
		return nil, err
	}

	// Repository layer can add transformation logic here if needed
	// For now, direct passthrough from client to handler
	return client.UploadFile(ctx, params)
}
