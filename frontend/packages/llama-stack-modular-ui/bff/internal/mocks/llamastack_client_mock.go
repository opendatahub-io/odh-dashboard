package mocks

import (
	"fmt"
	"sync"

	"github.com/opendatahub-io/llama-stack-modular-ui/internal/integrations"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/integrations/llamastack"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/repositories"
	"github.com/stretchr/testify/mock"
)

type LlamastackClientMock struct {
	mock.Mock
	registeredVectorDBs []llamastack.VectorDB
	mutex               sync.RWMutex
}

var _ repositories.LlamaStackClientInterface = &LlamastackClientMock{}

func NewLlamastackClientMock() (*LlamastackClientMock, error) {
	return &LlamastackClientMock{
		registeredVectorDBs: []llamastack.VectorDB{},
	}, nil
}

// Ensure LlamastackClientMock implements all required interfaces
var _ repositories.LlamaStackClientInterface = &LlamastackClientMock{}

func (l *LlamastackClientMock) GetAllModels(_ integrations.HTTPClientInterface) (*llamastack.ModelList, error) {
	data := llamastack.ModelList{
		Data: []llamastack.Model{
			{
				Identifier:         "default-model-id-1",
				ModelType:          llamastack.LLMModelType,
				ProviderID:         "default-provider-id-1",
				ProviderResourceID: "default-provider-resource-id-1",
			},
			{
				Identifier:         "default-model-id-2",
				ModelType:          llamastack.EmbeddingModelType,
				ProviderID:         "default-provider-id-2",
				ProviderResourceID: "default-provider-resource-id-2",
			},
		},
	}

	return &data, nil
}

func (l *LlamastackClientMock) GetAllVectorDBs(_ integrations.HTTPClientInterface) (*llamastack.VectorDBList, error) {
	l.mutex.RLock()
	defer l.mutex.RUnlock()

	// Start with default vector DBs
	data := llamastack.VectorDBList{
		Data: []llamastack.VectorDB{
			{
				Identifier:         "default-vector-db-id-1",
				ProviderID:         "default-provider-id-1",
				ProviderResourceID: "default-provider-resource-id-1",
				EmbeddingDimension: 1536,
				EmbeddingModel:     "default-embedding-model-1",
			},
			{
				Identifier:         "default-vector-db-id-2",
				ProviderID:         "default-provider-id-2",
				ProviderResourceID: "default-provider-resource-id-2",
				EmbeddingDimension: 1536,
				EmbeddingModel:     "default-embedding-model-2",
			},
		},
	}

	// Add any registered vector DBs
	data.Data = append(data.Data, l.registeredVectorDBs...)

	return &data, nil
}

func (l *LlamastackClientMock) RegisterVectorDB(_ integrations.HTTPClientInterface, vectorDB llamastack.VectorDB, embeddingModel string) error {
	l.mutex.Lock()
	defer l.mutex.Unlock()

	// Check if vector DB with this identifier already exists
	for _, existingDB := range l.registeredVectorDBs {
		if existingDB.Identifier == vectorDB.Identifier {
			return fmt.Errorf("vector database with identifier '%s' already exists", vectorDB.Identifier)
		}
	}

	// Create a new vector DB entry with the provided embedding model
	newVectorDB := llamastack.VectorDB{
		Identifier:         vectorDB.Identifier,
		ProviderID:         "inline::milvus", // Default provider for mock
		ProviderResourceID: vectorDB.Identifier,
		EmbeddingDimension: 384, // Default dimension for mock
		EmbeddingModel:     embeddingModel,
	}

	// Add to the registered vector DBs
	l.registeredVectorDBs = append(l.registeredVectorDBs, newVectorDB)

	return nil
}

func (l *LlamastackClientMock) InsertDocuments(_ integrations.HTTPClientInterface, request llamastack.DocumentInsertRequest) error {
	l.mutex.Lock()
	defer l.mutex.Unlock()

	// Validate documents
	if len(request.Documents) == 0 {
		return fmt.Errorf("at least one document is required")
	}

	// Check if vector database exists (both registered and default)
	vectorDBExists := false
	for _, vectorDB := range l.registeredVectorDBs {
		if vectorDB.Identifier == request.VectorDBID {
			vectorDBExists = true
			break
		}
	}

	// Check default vector DBs
	// This is just in case we don't have the vector database in the registered ones
	if !vectorDBExists {
		defaultDBs := []string{"default-vector-db-id-1", "default-vector-db-id-2"}
		for _, defaultDB := range defaultDBs {
			if defaultDB == request.VectorDBID {
				vectorDBExists = true
				break
			}
		}
	}

	// If vector database doesn't exist, create it automatically
	if !vectorDBExists {
		fmt.Printf("Mock: Creating vector database '%s'\n", request.VectorDBID)

		// Create a new vector DB entry (simulating auto-creation)
		newVectorDB := llamastack.VectorDB{
			Identifier:         request.VectorDBID,
			ProviderID:         "inline::milvus",
			ProviderResourceID: request.VectorDBID,
			EmbeddingDimension: 384,
			EmbeddingModel:     "mock-embedding-model",
		}

		// Add to the registered vector DBs
		l.registeredVectorDBs = append(l.registeredVectorDBs, newVectorDB)
	}

	// Simulate successful document insertion
	fmt.Printf("Mock: Added %d document(s) to vector database '%s'\n", len(request.Documents), request.VectorDBID)

	for _, doc := range request.Documents {
		fmt.Printf("Mock: - Document: %s\n", doc.DocumentID)
	}

	return nil
}

func (l *LlamastackClientMock) QueryEmbeddingModel(_ integrations.HTTPClientInterface, request llamastack.QueryEmbeddingModelRequest) (llamastack.QueryEmbeddingModelResponse, error) {
	l.mutex.Lock()
	defer l.mutex.Unlock()

	// Validate request
	if request.Content == "" {
		return llamastack.QueryEmbeddingModelResponse{}, fmt.Errorf("content is required")
	}

	if len(request.VectorDBIDs) == 0 {
		return llamastack.QueryEmbeddingModelResponse{}, fmt.Errorf("at least one vector_db_id is required")
	}

	// Simulate successful query response
	response := llamastack.QueryEmbeddingModelResponse{
		Content: []llamastack.ContentItem{
			{
				Type: "text",
				Text: fmt.Sprintf("Mock response for query: %s", request.Content),
			},
			{
				Type: "text",
				Text: "Additional mock content from vector database",
			},
			{
				Type: "text",
				Text: "More relevant content based on the query",
			},
		},
		Metadata: llamastack.Metadata{
			DocumentIDs: []string{"mock-doc-001", "mock-doc-002"},
			Chunks:      []string{"Mock chunk 1", "Mock chunk 2"},
			Scores:      []float64{0.95, 0.87},
		},
	}

	fmt.Printf("Mock: Query executed successfully for content: %s\n", request.Content)
	fmt.Printf("Mock: Searched in vector databases: %v\n", request.VectorDBIDs)
	fmt.Printf("Mock: Returning %d content items\n", len(response.Content))

	return response, nil
}

func (l *LlamastackClientMock) ChatCompletion(_ integrations.HTTPClientInterface, request llamastack.ChatCompletionRequest) (llamastack.ChatCompletionResponse, error) {
	l.mutex.Lock()
	defer l.mutex.Unlock()

	// Validate request
	if request.ModelID == "" {
		return llamastack.ChatCompletionResponse{}, fmt.Errorf("model_id is required")
	}

	if len(request.Messages) == 0 {
		return llamastack.ChatCompletionResponse{}, fmt.Errorf("messages are required")
	}

	// Get the last user message for context
	var lastUserMessage string
	for i := len(request.Messages) - 1; i >= 0; i-- {
		if request.Messages[i].Role == "user" {
			lastUserMessage = request.Messages[i].Content
			break
		}
	}

	// Simulate successful chat completion response
	response := llamastack.ChatCompletionResponse{
		Metrics: []llamastack.Metric{
			{Metric: "prompt_tokens", Value: 50, Unit: nil},
			{Metric: "completion_tokens", Value: 25, Unit: nil},
			{Metric: "total_tokens", Value: 75, Unit: nil},
		},
		CompletionMessage: llamastack.CompletionMessage{
			Role:       "assistant",
			Content:    fmt.Sprintf("Mock response to: %s. This is a simulated chat completion response based on the provided context and messages.", lastUserMessage),
			StopReason: "stop",
			ToolCalls:  []interface{}{},
		},
		Logprobs: nil,
	}

	fmt.Printf("Mock: Chat completion executed successfully for model: %s\n", request.ModelID)
	fmt.Printf("Mock: Processed %d messages\n", len(request.Messages))
	fmt.Printf("Mock: Returning response with completion message\n")

	return response, nil
}
