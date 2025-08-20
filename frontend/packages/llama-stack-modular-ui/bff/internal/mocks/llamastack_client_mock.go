package mocks

import (
	"context"

	"github.com/openai/openai-go/v2"
	"github.com/openai/openai-go/v2/responses"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/clients"
)

// MockLlamaStackClient provides a mock implementation of the LlamaStackClient for testing
type MockLlamaStackClient struct {
	// Add fields here if you need to store state for testing
}

// NewMockLlamaStackClient creates a new mock client
func NewMockLlamaStackClient() *MockLlamaStackClient {
	return &MockLlamaStackClient{}
}

// ListModels returns mock model data
func (m *MockLlamaStackClient) ListModels(ctx context.Context) ([]openai.Model, error) {
	return []openai.Model{
		{
			ID:      "ollama/llama3.2:3b",
			Object:  "model",
			Created: 1755721063,
			OwnedBy: "llama_stack",
		},
		{
			ID:      "ollama/all-minilm:l6-v2",
			Object:  "model",
			Created: 1755721063,
			OwnedBy: "llama_stack",
		},
	}, nil
}

// ListVectorStores returns mock vector store data with optional parameters
func (m *MockLlamaStackClient) ListVectorStores(ctx context.Context, params clients.ListVectorStoresParams) ([]openai.VectorStore, error) {
	return []openai.VectorStore{
		{
			ID:         "vs_mock123",
			Object:     "vector_store",
			CreatedAt:  1755721097,
			Name:       "Mock Vector Store",
			UsageBytes: 0,
			FileCounts: openai.VectorStoreFileCounts{
				InProgress: 0,
				Completed:  1,
				Failed:     0,
				Cancelled:  0,
				Total:      1,
			},
			Status:       "completed",
			LastActiveAt: 1755721097,
			Metadata: map[string]string{
				"provider_id":           "milvus",
				"provider_vector_db_id": "vs_mock123",
			},
		},
	}, nil
}

// CreateVectorStore returns a mock created vector store with optional parameters
func (m *MockLlamaStackClient) CreateVectorStore(ctx context.Context, params clients.CreateVectorStoreParams) (*openai.VectorStore, error) {
	name := params.Name
	if name == "" {
		name = "Mock Vector Store"
	}

	mockID := "vs_mock_new123"
	return &openai.VectorStore{
		ID:         mockID,
		Object:     "vector_store",
		CreatedAt:  1755721097,
		Name:       name,
		UsageBytes: 0,
		FileCounts: openai.VectorStoreFileCounts{
			InProgress: 0,
			Completed:  0,
			Failed:     0,
			Cancelled:  0,
			Total:      0,
		},
		Status:       "completed",
		LastActiveAt: 1755721097,
		Metadata: map[string]string{
			"provider_id":           "milvus",
			"provider_vector_db_id": mockID,
		},
	}, nil
}

// UploadFile uploads a file with optional parameters and optionally adds to vector store
func (m *MockLlamaStackClient) UploadFile(ctx context.Context, params clients.UploadFileParams) (*clients.FileUploadResult, error) {
	mockFileID := "file-mock123abc456def"
	result := &clients.FileUploadResult{
		FileID: mockFileID,
	}

	// If vector store ID is provided, simulate adding to vector store
	if params.VectorStoreID != "" {
		result.VectorStoreFile = &openai.VectorStoreFile{
			ID:            mockFileID,
			Object:        "vector_store.file",
			UsageBytes:    0,
			CreatedAt:     1755721386,
			VectorStoreID: params.VectorStoreID,
			Status:        "completed",
		}
	}

	return result, nil
}

// CreateResponse returns a mock response with comprehensive parameter support
func (m *MockLlamaStackClient) CreateResponse(ctx context.Context, params clients.CreateResponseParams) (*responses.Response, error) {
	// Create a simple mock response that compiles - the BFF will extract content using the simplified response handler
	mockResponse := &responses.Response{
		ID:        "resp_mock123",
		Object:    "response",
		CreatedAt: 1234567890.0,
		Model:     params.Model,
		Status:    "completed",
		Metadata:  map[string]string{},
	}

	return mockResponse, nil
}
