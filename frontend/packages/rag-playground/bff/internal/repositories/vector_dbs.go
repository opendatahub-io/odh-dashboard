package repositories

import (
	"bytes"
	"encoding/json"
	"fmt"

	"github.com/opendatahub-io/rag-playground/internal/integrations"
	"github.com/opendatahub-io/rag-playground/internal/integrations/llamastack"
)

const vectorDBsPath = "/v1/vector-dbs"

// Used on the FE side to interact with the vectorDB API.
type VectorDBInterface interface {
	GetAllVectorDBs(client integrations.HTTPClientInterface) (*llamastack.VectorDBList, error)
	RegisterVectorDB(client integrations.HTTPClientInterface, vectorDB llamastack.VectorDB, embeddingModel string) error
}

type UIVectorDB struct {
}

func (m UIVectorDB) GetAllVectorDBs(client integrations.HTTPClientInterface) (*llamastack.VectorDBList, error) {
	response, err := client.GET(vectorDBsPath)

	if err != nil {
		return nil, fmt.Errorf("failed to retrieve vectorDBs: %w", err)
	}

	var vectorDBList llamastack.VectorDBList
	if err := json.Unmarshal(response, &vectorDBList); err != nil {
		return nil, fmt.Errorf("error decoding response data: %w", err)
	}

	return &vectorDBList, nil
}

// VectorDBRegistrationRequest represents the request body for registering a vector database
type VectorDBRegistrationRequest struct {
	VectorDBID     string `json:"vector_db_id"`
	EmbeddingModel string `json:"embedding_model"`
}

func (m UIVectorDB) RegisterVectorDB(client integrations.HTTPClientInterface, vectorDB llamastack.VectorDB, embeddingModel string) error {
	// Create the request body with the required parameters
	requestBody := VectorDBRegistrationRequest{
		VectorDBID:     vectorDB.Identifier,
		EmbeddingModel: embeddingModel,
	}

	// Marshal the request body to JSON
	jsonBody, err := json.Marshal(requestBody)
	if err != nil {
		return fmt.Errorf("error marshaling request body: %w", err)
	}

	// Create a bytes reader for the request body
	bodyReader := bytes.NewReader(jsonBody)

	// Make the POST request
	response, err := client.POST(vectorDBsPath, bodyReader)
	if err != nil {
		return fmt.Errorf("failed to register vector database: %w", err)
	}

	// Log the response for debugging (optional)
	fmt.Printf("Vector database registration response: %s\n", string(response))

	return nil
}
