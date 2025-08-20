package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/clients"
)

type VectorStoresResponse struct {
	Data interface{} `json:"data"`
}

type VectorStoreResponse struct {
	Data interface{} `json:"data"`
}

// CreateVectorStoreRequest represents the request body for creating a vector store
type CreateVectorStoreRequest struct {
	// Name: Required name for the vector store (1-256 chars)
	Name string `json:"name"`
	// Metadata: Set of 16 key-value pairs, keys max 64 chars, values max 512 chars (optional)
	Metadata map[string]string `json:"metadata,omitempty"`
	// Note: expires_after, provider_id, chunking_strategy, embedding_model, embedding_dimension, file_ids
	// parameters are not working with Llama Stack - removed from API
}

// LlamaStackListVectorStoresHandler handles GET /genai/v1/vectorstores
func (app *App) LlamaStackListVectorStoresHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	// Parse query parameters
	params := clients.ListVectorStoresParams{}

	// Parse limit parameter (1-100, default 20)
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if limit, err := strconv.ParseInt(limitStr, 10, 64); err == nil {
			if limit >= 1 && limit <= 100 {
				params.Limit = &limit
			}
		}
	}

	// Parse order parameter ("asc" or "desc")
	if order := r.URL.Query().Get("order"); order == "asc" || order == "desc" {
		params.Order = order
	}

	vectorStores, err := app.repositories.LlamaStack.ListVectorStores(ctx, params)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	response := VectorStoresResponse{
		Data: vectorStores,
	}

	err = app.WriteJSON(w, http.StatusOK, response, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// LlamaStackCreateVectorStoreHandler handles POST /genai/v1/vectorstores
func (app *App) LlamaStackCreateVectorStoreHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	// Parse the request body
	var createRequest CreateVectorStoreRequest
	if err := json.NewDecoder(r.Body).Decode(&createRequest); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	// Convert to client params (only working parameters)
	params := clients.CreateVectorStoreParams{
		Name:     createRequest.Name,
		Metadata: createRequest.Metadata,
	}

	vectorStore, err := app.repositories.LlamaStack.CreateVectorStore(ctx, params)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	response := VectorStoreResponse{
		Data: vectorStore,
	}

	err = app.WriteJSON(w, http.StatusCreated, response, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
