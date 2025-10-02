package repositories

import (
	"context"

	"github.com/openai/openai-go/v2/packages/ssestream"
	"github.com/openai/openai-go/v2/responses"
	helper "github.com/opendatahub-io/gen-ai/internal/helpers"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack"
)

// ResponsesRepository handles AI response generation operations and data transformations.
type ResponsesRepository struct {
	// No fields needed - factory and URL come from context
}

// NewResponsesRepository creates a new responses repository.
func NewResponsesRepository() *ResponsesRepository {
	return &ResponsesRepository{}
}

// CreateResponse creates an AI response and transforms the result for BFF use.
// The LlamaStack client is expected to be in the context (created by AttachLlamaStackClient middleware).
func (r *ResponsesRepository) CreateResponse(ctx context.Context, params llamastack.CreateResponseParams) (*responses.Response, error) {
	// Get ready-to-use LlamaStack client from context using helper
	client, err := helper.GetContextLlamaStackClient(ctx)
	if err != nil {
		return nil, err
	}

	// Repository layer can add transformation logic here if needed
	// For now, direct passthrough from client to handler
	return client.CreateResponse(ctx, params)
}

// CreateResponseStream creates a streaming AI response and transforms the result for BFF use.
func (r *ResponsesRepository) CreateResponseStream(ctx context.Context, params llamastack.CreateResponseParams) (*ssestream.Stream[responses.ResponseStreamEventUnion], error) {
	// Get ready-to-use LlamaStack client from context using helper
	client, err := helper.GetContextLlamaStackClient(ctx)
	if err != nil {
		return nil, err
	}

	// Repository layer can add transformation logic here if needed
	// For now, direct passthrough from client to handler
	return client.CreateResponseStream(ctx, params)
}

// GetClient returns the underlying client from context for mock delegation purposes
func (r *ResponsesRepository) GetClient(ctx context.Context) (llamastack.LlamaStackClientInterface, error) {
	return helper.GetContextLlamaStackClient(ctx)
}

// GetResponse retrieves a response by ID for validation purposes
func (r *ResponsesRepository) GetResponse(ctx context.Context, responseID string) (*responses.Response, error) {
	// Get ready-to-use LlamaStack client from context using helper
	client, err := helper.GetContextLlamaStackClient(ctx)
	if err != nil {
		return nil, err
	}

	// Repository layer can add transformation logic here if needed
	// For now, direct passthrough from client to handler
	return client.GetResponse(ctx, responseID)
}
