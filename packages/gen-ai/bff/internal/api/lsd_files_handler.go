package api

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack"
)

type FileUploadResponse = llamastack.APIResponse

// LlamaStackUploadFileHandler handles POST /gen-ai/api/v1/files/upload.
func (app *App) LlamaStackUploadFileHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	err := r.ParseMultipartForm(32 << 20) // 32MB max memory
	if err != nil {
		app.badRequestResponse(w, r, fmt.Errorf("failed to parse multipart form: %w", err))
		return
	}
	// Ensure cleanup of any temporary files created by ParseMultipartForm
	defer func() {
		if r.MultipartForm != nil {
			// Intentionally ignore error from cleanup - best effort to remove temp files
			_ = r.MultipartForm.RemoveAll()
		}
	}()

	file, header, err := r.FormFile("file")
	if err != nil {
		app.badRequestResponse(w, r, errors.New("file is required"))
		return
	}
	defer file.Close()

	vectorStoreID := r.FormValue("vector_store_id")
	if vectorStoreID == "" {
		app.badRequestResponse(w, r, errors.New("vector_store_id is required"))
		return
	}

	purpose := r.FormValue("purpose")

	var chunkingStrategy *llamastack.ChunkingStrategy
	if chunkingType := r.FormValue("chunking_type"); chunkingType != "" {
		chunkingStrategy = &llamastack.ChunkingStrategy{
			Type: chunkingType,
		}
		if chunkingType == "static" {
			if maxChunkStr := r.FormValue("max_chunk_size_tokens"); maxChunkStr != "" {
				if maxChunk, err := strconv.Atoi(maxChunkStr); err == nil && maxChunk > 0 {
					if chunkingStrategy.Static == nil {
						chunkingStrategy.Static = &llamastack.StaticChunkingConfig{}
					}
					chunkingStrategy.Static.MaxChunkSizeTokens = maxChunk
				}
			}

			if overlapStr := r.FormValue("chunk_overlap_tokens"); overlapStr != "" {
				if overlap, err := strconv.Atoi(overlapStr); err == nil && overlap >= 0 {
					if chunkingStrategy.Static == nil {
						chunkingStrategy.Static = &llamastack.StaticChunkingConfig{}
					}
					chunkingStrategy.Static.ChunkOverlapTokens = overlap
				}
			}
		}
	}

	// Use direct streaming - no temp file needed!
	uploadParams := llamastack.UploadFileParams{
		Reader:           file,
		Filename:         header.Filename,
		ContentType:      header.Header.Get("Content-Type"),
		Purpose:          purpose,
		VectorStoreID:    vectorStoreID,
		ChunkingStrategy: chunkingStrategy,
	}

	result, err := app.repositories.Files.UploadFile(ctx, uploadParams)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Use envelope pattern for consistent response structure
	response := FileUploadResponse{
		Data: result,
	}

	err = app.WriteJSON(w, http.StatusCreated, response, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

type FilesListResponse = llamastack.APIResponse

// LlamaStackListFilesHandler handles GET /gen-ai/api/v1/lsd/files.
func (app *App) LlamaStackListFilesHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	// Parse query parameters
	params := llamastack.ListFilesParams{}

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

	// Parse purpose parameter
	if purpose := r.URL.Query().Get("purpose"); purpose != "" {
		params.Purpose = purpose
	}

	result, err := app.repositories.Files.ListFiles(ctx, params)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Use envelope pattern for consistent response structure
	response := FilesListResponse{
		Data: result,
	}

	err = app.WriteJSON(w, http.StatusOK, response, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// LlamaStackDeleteFileHandler handles DELETE /gen-ai/api/v1/lsd/files/delete.
func (app *App) LlamaStackDeleteFileHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	// Get file_id from query parameter
	fileID := r.URL.Query().Get("file_id")
	if fileID == "" {
		app.badRequestResponse(w, r, errors.New("file_id query parameter is required"))
		return
	}

	err := app.repositories.Files.DeleteFile(ctx, fileID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Return success response
	response := llamastack.APIResponse{
		Data: map[string]interface{}{
			"id":      fileID,
			"object":  "file",
			"deleted": true,
		},
	}

	err = app.WriteJSON(w, http.StatusOK, response, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
