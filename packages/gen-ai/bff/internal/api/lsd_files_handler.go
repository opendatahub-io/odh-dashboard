package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"time"

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

	r.Body = http.MaxBytesReader(w, r.Body, constants.FileUploadMaxBodySize)

	err := r.ParseMultipartForm(constants.FileUploadMaxBodySize)
	if err != nil {
		var maxBytesErr *http.MaxBytesError
		if errors.As(err, &maxBytesErr) {
			app.payloadTooLargeResponse(w, r, maxBytesErr.Limit)
			return
		}
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
	jobID, err := app.fileUploadJobTracker.CreateJob(namespace)
	if err != nil {
		os.Remove(tempFilePath)
		app.serverErrorResponse(w, r, fmt.Errorf("failed to create upload job: %w", err))
		return
	}

	// Process upload in background
	// Note: The temp file will be cleaned up by ProcessUploadJob when done
	// Create a detached context that preserves values but isn't cancelled with the request
	// Extract LlamaStack client from request context to preserve it in background processing
	llamaStackClient, _ := ctx.Value(constants.LlamaStackClientKey).(llamastack.LlamaStackClientInterface)
	bgCtx := context.WithValue(context.Background(), constants.NamespaceQueryParameterKey, namespace)
	if llamaStackClient != nil {
		bgCtx = context.WithValue(bgCtx, constants.LlamaStackClientKey, llamaStackClient)
	}
	app.fileUploadJobTracker.ProcessUploadJob(
		bgCtx,
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
		app.handleLlamaStackClientError(w, r, err)
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
		app.handleLlamaStackClientError(w, r, err)
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

// LlamaStackMediaFileUploadHandler handles POST /gen-ai/api/v1/lsd/files/media.
// Synchronous proxy to OGX Files API for media file uploads (vision images, audio).
// The required "type" form field drives MIME validation and OGX purpose mapping.
func (app *App) LlamaStackMediaFileUploadHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	start := time.Now()

	// Use the largest configured limit for initial body parsing.
	// Per-type size validation happens after reading the type field.
	r.Body = http.MaxBytesReader(w, r.Body, constants.MediaUploadMaxBodySize)
	if err := r.ParseMultipartForm(constants.MediaUploadMaxBodySize); err != nil {
		var maxBytesErr *http.MaxBytesError
		if errors.As(err, &maxBytesErr) {
			app.payloadTooLargeResponse(w, r, maxBytesErr.Limit)
			return
		}
		app.badRequestResponse(w, r, fmt.Errorf("failed to parse multipart form: %w", err))
		return
	}
	defer func() {
		if r.MultipartForm != nil {
			_ = r.MultipartForm.RemoveAll()
		}
	}()

	mediaType := r.FormValue("type")
	config, exists := constants.MediaTypeConfigs[mediaType]
	if !exists {
		app.badRequestResponse(w, r, fmt.Errorf("type is required; must be one of: %v", constants.SupportedMediaTypes()))
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		app.badRequestResponse(w, r, errors.New("file is required"))
		return
	}
	defer file.Close()

	contentType := header.Header.Get("Content-Type")
	if !config.AllowedMIME[contentType] {
		allowed := make([]string, 0, len(config.AllowedMIME))
		for mime := range config.AllowedMIME {
			allowed = append(allowed, mime)
		}
		app.badRequestResponse(w, r, fmt.Errorf("invalid file type '%s' for type '%s'; accepted: %v", contentType, mediaType, allowed))
		return
	}

	if header.Size > config.MaxBodySize {
		app.payloadTooLargeResponse(w, r, config.MaxBodySize)
		return
	}

	app.logger.Info("Media file upload started", "type", mediaType, "filename", header.Filename, "size", header.Size, "mime", contentType)

	lsClient, ok := r.Context().Value(constants.LlamaStackClientKey).(llamastack.LlamaStackClientInterface)
	if !ok || lsClient == nil {
		app.serviceUnavailableResponse(w, r, errors.New("OGX client not available"))
		return
	}

	result, err := lsClient.UploadFile(r.Context(), llamastack.UploadFileParams{
		Reader:      file,
		Filename:    header.Filename,
		ContentType: contentType,
		Purpose:     config.OGXPurpose,
	})
	elapsed := time.Since(start).Milliseconds()
	if err != nil {
		app.logger.Error("Media file upload failed", "type", mediaType, "filename", header.Filename, "error", err, "duration_ms", elapsed)
		app.handleLlamaStackClientError(w, r, err)
		return
	}

	app.logger.Info("Media file upload complete", "type", mediaType, "filename", header.Filename, "file_id", result.FileID, "duration_ms", elapsed)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"data": map[string]interface{}{
			"id":       result.FileID,
			"object":   "file",
			"filename": header.Filename,
			"type":     mediaType,
			"status":   "processed",
		},
	})
}
