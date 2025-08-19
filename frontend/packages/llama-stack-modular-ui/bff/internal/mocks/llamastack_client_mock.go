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
			ID:      "llama-3.1-8b",
			Object:  "model",
			Created: 1234567890,
			OwnedBy: "meta",
		},
		{
			ID:      "llama-3.1-70b",
			Object:  "model",
			Created: 1234567890,
			OwnedBy: "meta",
		},
	}, nil
}

// ListVectorStores returns mock vector store data with optional parameters
func (m *MockLlamaStackClient) ListVectorStores(ctx context.Context, params clients.ListVectorStoresParams) ([]openai.VectorStore, error) {
	return []openai.VectorStore{
		{
			ID:         "vs_test123",
			Object:     "vector_store",
			CreatedAt:  1234567890,
			Name:       "Test Vector Store",
			UsageBytes: 1024,
			FileCounts: openai.VectorStoreFileCounts{
				InProgress: 0,
				Completed:  1,
				Failed:     0,
				Cancelled:  0,
				Total:      1,
			},
			Status:       "completed",
			LastActiveAt: 1234567890,
			Metadata:     map[string]string{},
		},
	}, nil
}

// CreateVectorStore returns a mock created vector store with optional parameters
func (m *MockLlamaStackClient) CreateVectorStore(ctx context.Context, params clients.CreateVectorStoreParams) (*openai.VectorStore, error) {
	name := params.Name
	if name == "" {
		name = "Mock Vector Store"
	}

	return &openai.VectorStore{
		ID:         "vs_new123",
		Object:     "vector_store",
		CreatedAt:  1234567890,
		Name:       name,
		UsageBytes: 0,
		FileCounts: openai.VectorStoreFileCounts{
			InProgress: 0,
			Completed:  0,
			Failed:     0,
			Cancelled:  0,
			Total:      0,
		},
		Status:       "pending",
		LastActiveAt: 1234567890,
		Metadata:     map[string]string{},
	}, nil
}

// UploadFile uploads a file with optional parameters and optionally adds to vector store
func (m *MockLlamaStackClient) UploadFile(ctx context.Context, params clients.UploadFileParams) (*clients.FileUploadResult, error) {
	result := &clients.FileUploadResult{
		FileID: "file_mock123",
	}

	// If vector store ID is provided, simulate adding to vector store
	if params.VectorStoreID != "" {
		result.VectorStoreFile = &openai.VectorStoreFile{
			ID:            "vsf_mock123",
			Object:        "vector_store.file",
			UsageBytes:    1024,
			CreatedAt:     1234567890,
			VectorStoreID: params.VectorStoreID,
			Status:        "completed",
		}
	}

	return result, nil
}

// CreateResponse returns a mock response with comprehensive parameter support
func (m *MockLlamaStackClient) CreateResponse(ctx context.Context, params clients.CreateResponseParams) (*responses.Response, error) {
	// Create a simple mock response - we'll create a minimal structure that compiles
	return &responses.Response{
		ID:        "resp_mock123",
		Object:    "response",
		CreatedAt: 1234567890.0,
		Model:     params.Model,
		Status:    "completed",
		Metadata:  map[string]string{},
		// Note: Usage and Output fields have complex structures - leaving as zero values for now
	}, nil
}

// GetResponse returns a mock response by ID
func (m *MockLlamaStackClient) GetResponse(ctx context.Context, responseID string) (*responses.Response, error) {
	return &responses.Response{
		ID:        responseID,
		Object:    "response",
		CreatedAt: 1234567890.0,
		Model:     "llama-3.1-8b",
		Status:    "completed",
		Metadata:  map[string]string{},
		// Note: Usage and Output fields have complex structures - leaving as zero values for now
	}, nil
}
