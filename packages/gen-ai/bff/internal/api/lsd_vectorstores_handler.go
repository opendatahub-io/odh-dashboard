package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack"
)

type VectorStoresResponse = llamastack.APIResponse
type VectorStoreResponse = llamastack.APIResponse

// CreateVectorStoreRequest represents the request body for creating a vector store
type CreateVectorStoreRequest struct {
	// Name: Required name for the vector store (1-256 chars)
	Name string `json:"name"`
	// Metadata: Set of 16 key-value pairs, keys max 64 chars, values max 512 chars (optional)
	Metadata map[string]string `json:"metadata,omitempty"`
}

// LlamaStackListVectorStoresHandler handles GET /gen-ai/api/v1/vectorstores
func (app *App) LlamaStackListVectorStoresHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	// Parse query parameters
	params := llamastack.ListVectorStoresParams{}

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

	vectorStores, err := app.repositories.VectorStores.ListVectorStores(ctx, params)
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

// LlamaStackCreateVectorStoreHandler handles POST /gen-ai/api/v1/vectorstores
func (app *App) LlamaStackCreateVectorStoreHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	// Parse the request body
	var createRequest CreateVectorStoreRequest
	if err := json.NewDecoder(r.Body).Decode(&createRequest); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	// Validate required fields
	if strings.TrimSpace(createRequest.Name) == "" {
		app.badRequestResponse(w, r, errors.New("name is required"))
		return
	}

	// Convert to client params (only working parameters)
	params := llamastack.CreateVectorStoreParams{
		Name:     createRequest.Name,
		Metadata: createRequest.Metadata,
	}

	vectorStore, err := app.repositories.VectorStores.CreateVectorStore(ctx, params)
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

// LlamaStackDeleteVectorStoreHandler handles DELETE /gen-ai/api/v1/lsd/vectorstores/delete.
func (app *App) LlamaStackDeleteVectorStoreHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	// Get vector_store_id from query parameter
	vectorStoreID := r.URL.Query().Get("vector_store_id")
	if vectorStoreID == "" {
		app.badRequestResponse(w, r, errors.New("vector_store_id query parameter is required"))
		return
	}

	err := app.repositories.VectorStores.DeleteVectorStore(ctx, vectorStoreID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Return success response
	response := llamastack.APIResponse{
		Data: map[string]interface{}{
			"id":      vectorStoreID,
			"object":  "vector_store.deleted",
			"deleted": true,
		},
	}

	err = app.WriteJSON(w, http.StatusOK, response, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

type VectorStoreFilesListResponse = llamastack.APIResponse

// LlamaStackListVectorStoreFilesHandler handles GET /gen-ai/api/v1/lsd/vectorstores/files.
func (app *App) LlamaStackListVectorStoreFilesHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	// Get vector_store_id from query parameter
	vectorStoreID := r.URL.Query().Get("vector_store_id")
	if vectorStoreID == "" {
		app.badRequestResponse(w, r, errors.New("vector_store_id query parameter is required"))
		return
	}

	// Parse query parameters
	params := llamastack.ListVectorStoreFilesParams{}

	// Parse limit parameter
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if limit, err := strconv.ParseInt(limitStr, 10, 64); err == nil {
			params.Limit = &limit
		} else {
			app.badRequestResponse(w, r, fmt.Errorf("invalid limit parameter: %s", limitStr))
			return
		}
	}

	// Parse order parameter
	if order := r.URL.Query().Get("order"); order != "" {
		params.Order = order
	}

	// Parse filter parameter
	if filter := r.URL.Query().Get("filter"); filter != "" {
		params.Filter = filter
	}

	result, err := app.repositories.VectorStores.ListVectorStoreFiles(ctx, vectorStoreID, params)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Use envelope pattern for consistent response structure
	response := VectorStoreFilesListResponse{
		Data: result,
	}

	err = app.WriteJSON(w, http.StatusOK, response, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// LlamaStackDeleteVectorStoreFileHandler handles DELETE /gen-ai/api/v1/lsd/vectorstores/files/delete.
func (app *App) LlamaStackDeleteVectorStoreFileHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	// Get vector_store_id from query parameter
	vectorStoreID := r.URL.Query().Get("vector_store_id")
	if vectorStoreID == "" {
		app.badRequestResponse(w, r, errors.New("vector_store_id query parameter is required"))
		return
	}

	// Get file_id from query parameter
	fileID := r.URL.Query().Get("file_id")
	if fileID == "" {
		app.badRequestResponse(w, r, errors.New("file_id query parameter is required"))
		return
	}

	err := app.repositories.VectorStores.DeleteVectorStoreFile(ctx, vectorStoreID, fileID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Return success response
	response := llamastack.APIResponse{
		Data: map[string]interface{}{
			"id":      fileID,
			"object":  "vector_store.file.deleted",
			"deleted": true,
		},
	}

	err = app.WriteJSON(w, http.StatusOK, response, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
