package api

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/clients"
)

type FileUploadResponse = clients.FileUploadResult

// LlamaStackUploadFileHandler handles POST /genai/v1/files/upload.
func (app *App) LlamaStackUploadFileHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	err := r.ParseMultipartForm(32 << 20) // 32MB max memory
	if err != nil {
		app.badRequestResponse(w, r, fmt.Errorf("failed to parse multipart form: %w", err))
		return
	}

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

	var chunkingStrategy *clients.ChunkingStrategy
	if chunkingType := r.FormValue("chunking_type"); chunkingType != "" {
		chunkingStrategy = &clients.ChunkingStrategy{
			Type: chunkingType,
		}
		if chunkingType == "static" {
			if maxChunkStr := r.FormValue("max_chunk_size_tokens"); maxChunkStr != "" {
				if maxChunk, err := strconv.Atoi(maxChunkStr); err == nil && maxChunk > 0 {
					if chunkingStrategy.Static == nil {
						chunkingStrategy.Static = &clients.StaticChunkingConfig{}
					}
					chunkingStrategy.Static.MaxChunkSizeTokens = maxChunk
				}
			}

			if overlapStr := r.FormValue("chunk_overlap_tokens"); overlapStr != "" {
				if overlap, err := strconv.Atoi(overlapStr); err == nil && overlap >= 0 {
					if chunkingStrategy.Static == nil {
						chunkingStrategy.Static = &clients.StaticChunkingConfig{}
					}
					chunkingStrategy.Static.ChunkOverlapTokens = overlap
				}
			}
		}
	}

	// Use direct streaming - no temp file needed!
	uploadParams := clients.UploadFileParams{
		Reader:           file,
		Filename:         header.Filename,
		ContentType:      header.Header.Get("Content-Type"),
		Purpose:          purpose,
		VectorStoreID:    vectorStoreID,
		ChunkingStrategy: chunkingStrategy,
	}

	result, err := app.repositories.LlamaStack.UploadFile(ctx, uploadParams)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	response := result

	err = app.WriteJSON(w, http.StatusCreated, response, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
