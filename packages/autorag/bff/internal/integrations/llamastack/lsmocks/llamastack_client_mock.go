package lsmocks

import (
	"context"
	"encoding/json"

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

// ListModels returns mock model data in LlamaStack native format
func (m *MockLlamaStackClient) ListModels(ctx context.Context) ([]openai.Model, error) {
	return []openai.Model{
		// LLM Models
		createMockModel("llama3.2:3b", "llm", "ollama", "ollama://models/llama3.2:3b"),
		createMockModel("mistral-7b-instruct", "llm", "ollama", "ollama://models/mistral-7b-instruct"),
		createMockModel("llama-3.1-8b-instruct", "llm", "ollama", "ollama://models/llama-3.1-8b-instruct"),
		createMockModel("meta-llama/Llama-3.2-1B-Instruct", "llm", "huggingface", "hf://meta-llama/Llama-3.2-1B-Instruct"),

		// Embedding Models
		createMockModel("all-minilm:l6-v2", "embedding", "ollama", "ollama://models/all-minilm:l6-v2"),
		createMockModel("nomic-embed-text", "embedding", "ollama", "ollama://models/nomic-embed-text"),
		createMockModel("sentence-transformers/all-MiniLM-L6-v2", "embedding", "huggingface", "hf://sentence-transformers/all-MiniLM-L6-v2"),
	}, nil
}

// createMockModel creates an openai.Model with LlamaStack native format in RawJSON
func createMockModel(identifier, modelType, providerID, providerResourceID string) openai.Model {
	// Create LlamaStack native format as JSON string
	nativeModel := map[string]interface{}{
		"identifier":           identifier,
		"model_type":           modelType,
		"provider_id":          providerID,
		"provider_resource_id": providerResourceID,
	}

	// Marshal to JSON bytes
	rawJSONBytes, err := json.Marshal(nativeModel)
	if err != nil {
		panic("lsmocks: failed to marshal mock model: " + err.Error())
	}

	// Unmarshal into openai.Model to preserve the raw JSON
	// The SDK will store the original JSON even though the fields don't match the struct
	var model openai.Model
	if err := json.Unmarshal(rawJSONBytes, &model); err != nil {
		panic("lsmocks: failed to unmarshal mock model: " + err.Error())
	}

	return model
}
