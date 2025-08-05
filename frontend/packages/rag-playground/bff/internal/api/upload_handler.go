package api

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/rag-playground/internal/constants"
	"github.com/opendatahub-io/rag-playground/internal/integrations"
	"github.com/opendatahub-io/rag-playground/internal/integrations/llamastack"
)

// UploadRequest represents the request body for document upload
type UploadRequest struct {
	Documents         []llamastack.Document `json:"documents"`
	VectorDBID        string                `json:"vector_db_id"`
	ChunkSizeInTokens *int                  `json:"chunk_size_in_tokens,omitempty"`
	EmbeddingModel    string                `json:"embedding_model"`
}

func (app *App) UploadHandler(w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	client, ok := r.Context().Value(constants.LlamaStackHttpClientKey).(integrations.HTTPClientInterface)

	if !ok {
		app.serverErrorResponse(w, r, errors.New("REST client not found"))
		return
	}

	// Parse the request body
	var uploadRequest UploadRequest
	if err := json.NewDecoder(r.Body).Decode(&uploadRequest); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	// Validate required fields
	if len(uploadRequest.Documents) == 0 {
		app.badRequestResponse(w, r, errors.New("documents are required"))
		return
	}
	if uploadRequest.VectorDBID == "" {
		app.badRequestResponse(w, r, errors.New("vector_db_id is required"))
		return
	}
	if uploadRequest.EmbeddingModel == "" {
		app.badRequestResponse(w, r, errors.New("embedding_model is required"))
		return
	}

	// Check if vector database exists
	exists, err := app.checkifVectorDBExists(client, uploadRequest.VectorDBID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// If vector database doesn't exist, create it
	if !exists {
		app.logger.Info("Vector database not found, creating new one", "vector_db_id", uploadRequest.VectorDBID)

		// Create a new vector database with  embedding model
		vectorDB := llamastack.VectorDB{
			Identifier: uploadRequest.VectorDBID,
		}

		err = app.repositories.LlamaStackClient.RegisterVectorDB(client, vectorDB, uploadRequest.EmbeddingModel)
		if err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}
		app.logger.Info("Vector database created successfully", "vector_db_id", uploadRequest.VectorDBID)
	} else {
		app.logger.Info("Vector database already exists", "vector_db_id", uploadRequest.VectorDBID)
	}

	// Create the document insert request
	documentInsertRequest := llamastack.DocumentInsertRequest{
		Documents:         uploadRequest.Documents,
		VectorDBID:        uploadRequest.VectorDBID,
		ChunkSizeInTokens: uploadRequest.ChunkSizeInTokens,
	}

	// Insert documents
	err = app.repositories.LlamaStackClient.InsertDocuments(client, documentInsertRequest)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Return success response
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(map[string]string{
		"message":      "Documents uploaded successfully",
		"vector_db_id": uploadRequest.VectorDBID,
	}); err != nil {
		app.logger.Error("Failed to encode response", "error", err)
	}
}

func (app *App) checkifVectorDBExists(client integrations.HTTPClientInterface, vectorDBName string) (bool, error) {
	vectorDBList, err := app.repositories.LlamaStackClient.GetAllVectorDBs(client)
	if err != nil {
		return false, err
	}

	for _, vectorDB := range vectorDBList.Data {
		if vectorDB.Identifier == vectorDBName {
			return true, nil
		}
	}
	return false, nil
}
