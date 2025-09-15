package repositories

import (
	"context"

	"github.com/openai/openai-go/v2/packages/ssestream"
	"github.com/openai/openai-go/v2/responses"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack"
)

// ResponsesRepository handles AI response generation operations and data transformations.
type ResponsesRepository struct {
	client llamastack.LlamaStackClientInterface
}

// NewResponsesRepository creates a new responses repository.
func NewResponsesRepository(client llamastack.LlamaStackClientInterface) *ResponsesRepository {
	return &ResponsesRepository{
		client: client,
	}
}

// CreateResponse creates an AI response and transforms the result for BFF use.
func (r *ResponsesRepository) CreateResponse(ctx context.Context, params llamastack.CreateResponseParams) (*responses.Response, error) {
	// Repository layer can add transformation logic here if needed
	// For now, direct passthrough from client to handler
	return r.client.CreateResponse(ctx, params)
}

// CreateResponseStream creates a streaming AI response and transforms the result for BFF use.
func (r *ResponsesRepository) CreateResponseStream(ctx context.Context, params llamastack.CreateResponseParams) (*ssestream.Stream[responses.ResponseStreamEventUnion], error) {
	// Repository layer can add transformation logic here if needed
	// For now, direct passthrough from client to handler
	return r.client.CreateResponseStream(ctx, params)
}

// Client returns the underlying client for mock delegation purposes
func (r *ResponsesRepository) Client() llamastack.LlamaStackClientInterface {
	return r.client
}
