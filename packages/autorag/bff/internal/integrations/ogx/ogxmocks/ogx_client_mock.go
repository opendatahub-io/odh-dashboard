package ogxmocks

import (
	"context"

	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/ogx"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
)

// MockOGXClient provides a mock implementation of the OGXClientInterface for testing
type MockOGXClient struct{}

// Ensure MockOGXClient implements the interface
var _ ogx.OGXClientInterface = (*MockOGXClient)(nil)

// NewMockOGXClient creates a new mock client with realistic test data
func NewMockOGXClient() ogx.OGXClientInterface {
	return &MockOGXClient{}
}

// ListModels returns mock model data in Open GenAI Stack native format
func (m *MockOGXClient) ListModels(ctx context.Context) ([]models.OGXNativeModel, error) {
	return []models.OGXNativeModel{
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

// ListProviders returns mock provider data matching OGX's /v1/providers response format.
func (m *MockOGXClient) ListProviders(ctx context.Context) ([]models.OGXProvider, error) {
	return []models.OGXProvider{
		{API: "vector_io", ProviderID: "milvus", ProviderType: "remote::milvus"},
		{API: "vector_io", ProviderID: "faiss", ProviderType: "inline::faiss"},
		{API: "inference", ProviderID: "ollama", ProviderType: "remote::ollama"},
	}, nil
}

// mockNativeModel creates a OGXNativeModel with the given fields.
func mockNativeModel(id, modelType, providerID, providerResourceID string) models.OGXNativeModel {
	return models.OGXNativeModel{
		ID: id,
		CustomMetadata: &models.OGXCustomMetadata{
			ModelType:          modelType,
			ProviderID:         providerID,
			ProviderResourceID: providerResourceID,
		},
	}
}
