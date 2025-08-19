package repositories

import (
	"context"

	"github.com/openai/openai-go/v2/responses"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/clients"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/interfaces"
)

// LlamaStackResponsesInterface defines the interface for response operations using OpenAI SDK
type LlamaStackResponsesInterface interface {
	CreateResponse(ctx context.Context, params clients.CreateResponseParams) (*responses.Response, error)
	GetResponse(ctx context.Context, responseID string) (*responses.Response, error)
}

type LlamaStackResponses struct {
	client interfaces.LlamaStackClientInterface
}

func NewLlamaStackResponses(client interfaces.LlamaStackClientInterface) *LlamaStackResponses {
	return &LlamaStackResponses{
		client: client,
	}
}

func (r *LlamaStackResponses) CreateResponse(ctx context.Context, params clients.CreateResponseParams) (*responses.Response, error) {
	return r.client.CreateResponse(ctx, params)
}

func (r *LlamaStackResponses) GetResponse(ctx context.Context, responseID string) (*responses.Response, error) {
	return r.client.GetResponse(ctx, responseID)
}
