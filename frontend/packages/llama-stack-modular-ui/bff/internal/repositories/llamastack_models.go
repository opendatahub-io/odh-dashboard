package repositories

import (
	"context"

	"github.com/openai/openai-go/v2"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/interfaces"
)

// LlamaStackModelsInterface defines the interface for model operations using OpenAI SDK
type LlamaStackModelsInterface interface {
	ListModels(ctx context.Context) ([]openai.Model, error)
}

type LlamaStackModels struct {
	client interfaces.LlamaStackClientInterface
}

func NewLlamaStackModels(client interfaces.LlamaStackClientInterface) *LlamaStackModels {
	return &LlamaStackModels{
		client: client,
	}
}

func (m *LlamaStackModels) ListModels(ctx context.Context) ([]openai.Model, error) {
	return m.client.ListModels(ctx)
}
