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
