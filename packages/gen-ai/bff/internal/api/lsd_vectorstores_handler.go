package api

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/julienschmidt/httprouter"
	"github.com/openai/openai-go/v2"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
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

// TEMPORARY: hashUsername creates a deterministic hash for username-based vectorstore isolation
// TODO: Remove this function when proper multi-tenant vectorstore support is implemented
func hashUsername(username string) string {
	hash := sha256.Sum256([]byte(username))
	// Use first 128 bits (16 bytes) results in 32 hex characters instead of 64
	return hex.EncodeToString(hash[:16])
}

// LlamaStackListVectorStoresHandler handles GET /gen-ai/api/v1/vectorstores
// TEMPORARY: This handler implements username-based vectorstore isolation by filtering
// the list to return only the vectorstore matching the hashed username.
// TODO: Replace with proper multi-tenant vectorstore support when available
func (app *App) LlamaStackListVectorStoresHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	// TEMPORARY: Get username from context for vectorstore isolation
	identity, ok := ctx.Value(constants.RequestIdentityKey).(*integrations.RequestIdentity)
	if !ok || identity == nil {
		app.unauthorizedResponse(w, r, errors.New("user identity not found in context"))
		return
	}

	// Get the Kubernetes client to fetch username (uses identity from context)
	client, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Fetch the username from the Kubernetes API
	username, err := client.GetUser(ctx, identity)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	hashedUsername := hashUsername(username)

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

	// Get all vectorstores
	vectorStores, err := app.repositories.VectorStores.ListVectorStores(ctx, params)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// TEMPORARY: Filter vectorstores to find the one matching hashed username
	var userVectorStore *openai.VectorStore
	foundUserVectorStore := false

	for i := range vectorStores {
		if vectorStores[i].Name == hashedUsername {
			userVectorStore = &vectorStores[i]
			foundUserVectorStore = true
			break
		}
	}

	// TEMPORARY: If no vectorstore found for this user, create one automatically
	if !foundUserVectorStore {
		createParams := llamastack.CreateVectorStoreParams{
			Name: hashedUsername,
			Metadata: map[string]string{
				"created_by": "auto-provisioning",
				"username":   username,
			},
		}

		newVectorStore, err := app.repositories.VectorStores.CreateVectorStore(ctx, createParams)
		if err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}

		userVectorStore = newVectorStore
	}

	// TEMPORARY: Return only the user's vectorstore as a single-item array
	response := VectorStoresResponse{
		Data: []openai.VectorStore{*userVectorStore},
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

	// Enrich each vectorstore file with filename information
	enrichedFiles := make([]map[string]interface{}, len(result))
	for i, vsFile := range result {
		// Convert VectorStoreFile to map for enrichment
		enrichedFile := map[string]interface{}{
			"id":                vsFile.ID,
			"created_at":        vsFile.CreatedAt,
			"last_error":        vsFile.LastError,
			"object":            vsFile.Object,
			"status":            vsFile.Status,
			"usage_bytes":       vsFile.UsageBytes,
			"vector_store_id":   vsFile.VectorStoreID,
			"attributes":        vsFile.Attributes,
			"chunking_strategy": vsFile.ChunkingStrategy,
		}

		// Fetch file details to get filename
		fileDetails, err := app.repositories.Files.GetFile(ctx, vsFile.ID)
		if err != nil {
			// If we can't get file details, log but continue without filename
			app.logger.Warn("Failed to fetch file details for enrichment",
				"file_id", vsFile.ID,
				"error", err)
		} else {
			// Add filename and other useful file metadata
			enrichedFile["filename"] = fileDetails.Filename
			enrichedFile["bytes"] = fileDetails.Bytes
			enrichedFile["purpose"] = fileDetails.Purpose
		}

		enrichedFiles[i] = enrichedFile
	}

	// Use envelope pattern for consistent response structure
	response := VectorStoreFilesListResponse{
		Data: enrichedFiles,
	}

	err = app.WriteJSON(w, http.StatusOK, response, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// LlamaStackDeleteVectorStoreFileHandler handles DELETE /gen-ai/api/v1/lsd/vectorstores/files/delete.
// TEMPORARY: This handler cascades the delete - it removes the file from the vectorstore
// AND deletes the actual file. This provides cleanup behavior until proper file lifecycle
// management is implemented.
// TODO: Replace with proper file lifecycle management when vectorstore sharing is supported
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

	// Step 1: Remove file from vectorstore
	err := app.repositories.VectorStores.DeleteVectorStoreFile(ctx, vectorStoreID, fileID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// TEMPORARY: Step 2 - Also delete the actual file
	// This provides cascading delete behavior until proper file sharing is supported
	err = app.repositories.Files.DeleteFile(ctx, fileID)
	if err != nil {
		// Log the error but don't fail the request since the file was already removed from vectorstore
		app.logger.Warn("Failed to delete file after removing from vectorstore",
			"file_id", fileID,
			"vector_store_id", vectorStoreID,
			"error", err)
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
