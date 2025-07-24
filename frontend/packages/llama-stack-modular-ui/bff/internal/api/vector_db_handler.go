package api

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/constants"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/integrations"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/integrations/llamastack"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/models"
)

type VectorDBEnvelope Envelope[models.VectorDB, None]
type VectorDBListEnvelope Envelope[models.VectorDBList, None]

// VectorDBRegistrationRequest represents the request body for registering a vector database
type VectorDBRegistrationRequest struct {
	VectorDBID     string `json:"vector_db_id"`
	EmbeddingModel string `json:"embedding_model"`
}

func (app *App) RegisterVectorDBHandler(w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	client, ok := r.Context().Value(constants.LlamaStackHttpClientKey).(integrations.HTTPClientInterface)
	if !ok {
		app.serverErrorResponse(w, r, errors.New("REST client not found"))
		return
	}

	// Parse the request body
	var requestBody VectorDBRegistrationRequest
	if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	// Validate required fields
	if requestBody.VectorDBID == "" {
		app.badRequestResponse(w, r, errors.New("vector_db_id is required"))
		return
	}
	if requestBody.EmbeddingModel == "" {
		app.badRequestResponse(w, r, errors.New("embedding_model is required"))
		return
	}

	// Create a VectorDB struct for the repository call
	vectorDB := llamastack.VectorDB{
		Identifier: requestBody.VectorDBID,
		// Other fields will be populated by the Llama Stack API
	}

	// Register the vector database
	err := app.repositories.LlamaStackClient.RegisterVectorDB(client, vectorDB, requestBody.EmbeddingModel)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Return success response
	w.WriteHeader(http.StatusCreated)
	if err := json.NewEncoder(w).Encode(map[string]string{
		"message":      "Vector database registered successfully",
		"vector_db_id": requestBody.VectorDBID,
	}); err != nil {
		app.logger.Error("Failed to encode response", "error", err)
	}
}

func (app *App) GetAllVectorDBsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	client, ok := r.Context().Value(constants.LlamaStackHttpClientKey).(integrations.HTTPClientInterface)

	if !ok {
		app.serverErrorResponse(w, r, errors.New("REST client not found"))
		return
	}

	vectorDBList, err := app.repositories.LlamaStackClient.GetAllVectorDBs(client)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	result := VectorDBListEnvelope{
		Data: convertVectorDBList(vectorDBList),
	}

	err = app.WriteJSON(w, http.StatusOK, result, nil)

	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func convertVectorDB(vectorDB *llamastack.VectorDB) models.VectorDB {
	return models.VectorDB{
		Identifier:         vectorDB.Identifier,
		ProviderID:         vectorDB.ProviderID,
		ProviderResourceID: vectorDB.ProviderResourceID,
		EmbeddingDimension: vectorDB.EmbeddingDimension,
		EmbeddingModel:     vectorDB.EmbeddingModel,
	}
}

func convertVectorDBList(vectorDBList *llamastack.VectorDBList) models.VectorDBList {
	var items []models.VectorDB

	for _, vectorDB := range vectorDBList.Data {
		items = append(items, convertVectorDB(&vectorDB))
	}

	return models.VectorDBList{
		Items: items,
	}
}
