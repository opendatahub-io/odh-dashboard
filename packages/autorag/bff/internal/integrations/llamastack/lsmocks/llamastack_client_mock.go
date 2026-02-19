package lsmocks

import (
	"context"

	"github.com/openai/openai-go/v2"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/llamastack"
)

// MockLlamaStackClient provides a mock implementation of the LlamaStackClientInterface for testing
type MockLlamaStackClient struct {
	// Add fields here if you need to store state for testing
}

// Ensure MockLlamaStackClient implements the interface
var _ llamastack.LlamaStackClientInterface = (*MockLlamaStackClient)(nil)

// NewMockLlamaStackClient creates a new mock client with realistic test data
func NewMockLlamaStackClient() llamastack.LlamaStackClientInterface {
	return &MockLlamaStackClient{}
}

// ListModels returns mock model data with realistic LLM and embedding models
func (m *MockLlamaStackClient) ListModels(ctx context.Context) ([]openai.Model, error) {
	return []openai.Model{
		// LLM Models
		{
			ID:      "ollama/llama3.2:3b",
			Object:  "model",
			Created: 1755721063,
			OwnedBy: "llama_stack",
		},
		{
			ID:      "mistral-7b-instruct",
			Object:  "model",
			Created: 1755721063,
			OwnedBy: "llama_stack",
		},
		{
			ID:      "llama-3.1-8b-instruct",
			Object:  "model",
			Created: 1755721063,
			OwnedBy: "llama_stack",
		},
		{
			ID:      "meta-llama/Llama-3.2-1B-Instruct",
			Object:  "model",
			Created: 1755721063,
			OwnedBy: "llama_stack",
		},
		// Embedding Models
		{
			ID:      "ollama/all-minilm:l6-v2",
			Object:  "model",
			Created: 1755721063,
			OwnedBy: "llama_stack",
		},
		{
			ID:      "nomic-embed-text",
			Object:  "model",
			Created: 1755721063,
			OwnedBy: "llama_stack",
		},
		{
			ID:      "sentence-transformers/all-MiniLM-L6-v2",
			Object:  "model",
			Created: 1755721063,
			OwnedBy: "llama_stack",
		},
	}, nil
}
