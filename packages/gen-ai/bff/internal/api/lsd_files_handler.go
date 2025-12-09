package api

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack"
	"github.com/opendatahub-io/gen-ai/internal/services"
)

type FileUploadResponse = llamastack.APIResponse

// LlamaStackUploadFileHandler handles POST /gen-ai/api/v1/files/upload.
// Returns 202 Accepted with a job ID, then processes the upload asynchronously.
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

	// Get namespace from context to use as user identifier
	namespace, ok := ctx.Value(constants.NamespaceQueryParameterKey).(string)
	if !ok || namespace == "" {
		app.serverErrorResponse(w, r, errors.New("namespace not found in context"))
		return
	}

	// Write file to temp location for background processing
	// Using temp file instead of io.ReadAll to avoid loading entire file into memory
	tempFile, err := os.CreateTemp("", "upload-*-"+header.Filename)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to create temp file: %w", err))
		return
	}
	tempFilePath := tempFile.Name()

	// Copy file content to temp file
	_, err = io.Copy(tempFile, file)
	if err != nil {
		tempFile.Close()
		os.Remove(tempFilePath)
		app.serverErrorResponse(w, r, fmt.Errorf("failed to write temp file: %w", err))
		return
	}
	tempFile.Close()

	// Create a job for async processing
	jobID := app.fileUploadJobTracker.CreateJob(namespace)
	if jobID == "" {
		os.Remove(tempFilePath)
		app.serverErrorResponse(w, r, errors.New("failed to create upload job"))
		return
	}

	// Process upload in background
	// Note: The temp file will be cleaned up by ProcessUploadJob when done
	app.fileUploadJobTracker.ProcessUploadJob(
		ctx,
		namespace,
		jobID,
		func(ctx context.Context, params llamastack.UploadFileParams) (*llamastack.FileUploadResult, error) {
			return app.repositories.Files.UploadFile(ctx, params)
		},
		llamastack.UploadFileParams{
			Reader:           nil, // Will be set in background goroutine from temp file
			Filename:         header.Filename,
			ContentType:      header.Header.Get("Content-Type"),
			Purpose:          purpose,
			VectorStoreID:    vectorStoreID,
			ChunkingStrategy: chunkingStrategy,
		},
		tempFilePath,
	)

	// Return 202 Accepted with job ID
	response := llamastack.APIResponse{
		Data: map[string]interface{}{
			"job_id": jobID,
			"status": "pending",
		},
	}

	err = app.WriteJSON(w, http.StatusAccepted, response, nil)
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

type FileUploadStatusResponse struct {
	JobID     string                       `json:"job_id"`
	Status    services.FileUploadJobStatus `json:"status"`
	Result    *llamastack.FileUploadResult `json:"result,omitempty"`
	Error     string                       `json:"error,omitempty"`
	CreatedAt string                       `json:"created_at"`
	UpdatedAt string                       `json:"updated_at"`
}

// LlamaStackFileUploadStatusHandler handles GET /gen-ai/api/v1/files/upload/status.
func (app *App) LlamaStackFileUploadStatusHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	// Get namespace from context
	namespace, ok := ctx.Value(constants.NamespaceQueryParameterKey).(string)
	if !ok || namespace == "" {
		app.serverErrorResponse(w, r, errors.New("namespace not found in context"))
		return
	}

	jobID := r.URL.Query().Get("job_id")
	if jobID == "" {
		app.badRequestResponse(w, r, errors.New("job_id query parameter is required"))
		return
	}

	job, err := app.fileUploadJobTracker.GetJob(namespace, jobID)
	if err != nil {
		app.notFoundResponse(w, r)
		return
	}

	response := FileUploadStatusResponse{
		JobID:     job.ID,
		Status:    job.Status,
		Result:    job.Result,
		Error:     job.Error,
		CreatedAt: job.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt: job.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	apiResponse := llamastack.APIResponse{
		Data: response,
	}

	err = app.WriteJSON(w, http.StatusOK, apiResponse, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
