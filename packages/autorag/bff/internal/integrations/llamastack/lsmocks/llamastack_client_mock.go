package lsmocks

import (
	"context"

	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/llamastack"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
)

// MockLlamaStackClient provides a mock implementation of the LlamaStackClientInterface for testing
type MockLlamaStackClient struct{}

// Ensure MockLlamaStackClient implements the interface
var _ llamastack.LlamaStackClientInterface = (*MockLlamaStackClient)(nil)

// NewMockLlamaStackClient creates a new mock client with realistic test data
func NewMockLlamaStackClient() llamastack.LlamaStackClientInterface {
	return &MockLlamaStackClient{}
}

// ListModels returns mock model data in LlamaStack native format
func (m *MockLlamaStackClient) ListModels(ctx context.Context) ([]models.LlamaStackNativeModel, error) {
	return []models.LlamaStackNativeModel{
		// LLM Models
		mockNativeModel("llama3.2:3b", "llm", "ollama", "ollama://models/llama3.2:3b"),
		mockNativeModel("mistral-7b-instruct", "llm", "ollama", "ollama://models/mistral-7b-instruct"),
		mockNativeModel("llama-3.1-8b-instruct", "llm", "ollama", "ollama://models/llama-3.1-8b-instruct"),
		mockNativeModel("meta-llama/Llama-3.2-1B-Instruct", "llm", "huggingface", "hf://meta-llama/Llama-3.2-1B-Instruct"),

		// Embedding Models
		mockNativeModel("all-minilm:l6-v2", "embedding", "ollama", "ollama://models/all-minilm:l6-v2"),
		mockNativeModel("nomic-embed-text", "embedding", "ollama", "ollama://models/nomic-embed-text"),
		mockNativeModel("sentence-transformers/all-MiniLM-L6-v2", "embedding", "huggingface", "hf://sentence-transformers/all-MiniLM-L6-v2"),
	}, nil
}

// ListProviders returns mock provider data matching LlamaStack's /v1/providers response format.
func (m *MockLlamaStackClient) ListProviders(ctx context.Context) ([]models.LlamaStackProvider, error) {
	return []models.LlamaStackProvider{
		{API: "vector_io", ProviderID: "milvus", ProviderType: "remote::milvus"},
		{API: "vector_io", ProviderID: "faiss", ProviderType: "inline::faiss"},
		{API: "inference", ProviderID: "ollama", ProviderType: "remote::ollama"},
	}, nil
}

// mockNativeModel creates a LlamaStackNativeModel with the given fields.
func mockNativeModel(id, modelType, providerID, providerResourceID string) models.LlamaStackNativeModel {
	return models.LlamaStackNativeModel{
		ID: id,
		CustomMetadata: &models.LlamaStackCustomMetadata{
			ModelType:          modelType,
			ProviderID:         providerID,
			ProviderResourceID: providerResourceID,
		},
	}
}
