package api

import (
	"encoding/json"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/openai/openai-go/v2"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/clients"
)

type VectorStoresResponse struct {
	Data []openai.VectorStore `json:"data"`
}

type VectorStoreResponse struct {
	Data *openai.VectorStore `json:"data"`
}

// CreateVectorStoreRequest represents the request body for creating a vector store
type CreateVectorStoreRequest struct {
	// Name: Optional name for the vector store (max 256 chars)
	Name string `json:"name,omitempty"`
	// FileIDs: List of file IDs to include in vector store
	FileIDs []string `json:"file_ids,omitempty"`
	// Metadata: Set of 16 key-value pairs, keys max 64 chars, values max 512 chars
	Metadata map[string]string `json:"metadata,omitempty"`
	// ExpiresAfter: Expiration policy (days/hours)
	ExpiresAfter map[string]interface{} `json:"expires_after,omitempty"`
	// ChunkingStrategy: "auto" or custom strategy
	ChunkingStrategy string `json:"chunking_strategy,omitempty"`
	// EmbeddingModel: Model for embeddings (Llama Stack extension)
	EmbeddingModel string `json:"embedding_model,omitempty"`
	// EmbeddingDimension: Vector dimension, default 384 (Llama Stack extension)
	EmbeddingDimension *int `json:"embedding_dimension,omitempty"`
	// ProviderID: Llama Stack provider ID (Llama Stack extension)
	ProviderID string `json:"provider_id,omitempty"`
}

// LlamaStackListVectorStoresHandler handles GET /genai/v1/vectorstores
func (app *App) LlamaStackListVectorStoresHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	// Parse optional query parameters
	params := clients.ListVectorStoresParams{}

	// TODO: Parse query parameters if needed (limit, order, after, before)
	// For now, use empty params (all defaults)

	vectorStores, err := app.repositories.LlamaStackVectorStores.ListVectorStores(ctx, params)
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

	// Convert to client params
	params := clients.CreateVectorStoreParams{
		Name:               createRequest.Name,
		FileIDs:            createRequest.FileIDs,
		Metadata:           createRequest.Metadata,
		ExpiresAfter:       createRequest.ExpiresAfter,
		ChunkingStrategy:   createRequest.ChunkingStrategy,
		EmbeddingModel:     createRequest.EmbeddingModel,
		EmbeddingDimension: createRequest.EmbeddingDimension,
		ProviderID:         createRequest.ProviderID,
	}

	vectorStore, err := app.repositories.LlamaStackVectorStores.CreateVectorStore(ctx, params)
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
