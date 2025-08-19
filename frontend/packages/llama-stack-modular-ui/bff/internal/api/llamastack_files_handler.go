package api

import (
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"

	"github.com/julienschmidt/httprouter"
	"github.com/openai/openai-go/v2"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/clients"
)

type FileUploadResponse struct {
	Message         string                  `json:"message"`
	FileID          string                  `json:"file_id"`
	VectorStore     *openai.VectorStore     `json:"vector_store,omitempty"`
	VectorStoreFile *openai.VectorStoreFile `json:"vector_store_file,omitempty"`
}

// LlamaStackUploadFileHandler handles POST /genai/v1/files/upload
func (app *App) LlamaStackUploadFileHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	// Parse multipart form
	err := r.ParseMultipartForm(32 << 20) // 32MB max memory
	if err != nil {
		app.badRequestResponse(w, r, fmt.Errorf("failed to parse multipart form: %w", err))
		return
	}

	// Get the uploaded file
	file, header, err := r.FormFile("file")
	if err != nil {
		app.badRequestResponse(w, r, errors.New("file is required"))
		return
	}
	defer file.Close()

	// Get required vector store ID
	vectorStoreID := r.FormValue("vector_store_id")
	if vectorStoreID == "" {
		app.badRequestResponse(w, r, errors.New("vector_store_id is required"))
		return
	}

	// Get optional purpose
	purpose := r.FormValue("purpose")

	// Create temporary file
	tempDir := os.TempDir()
	tempFilePath := filepath.Join(tempDir, header.Filename)

	tempFile, err := os.Create(tempFilePath)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to create temp file: %w", err))
		return
	}
	defer func() {
		tempFile.Close()
		os.Remove(tempFilePath) // Clean up temp file
	}()

	// Copy uploaded file to temp file
	_, err = io.Copy(tempFile, file)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to save uploaded file: %w", err))
		return
	}
	tempFile.Close() // Close before reading

	// Upload file to Llama Stack (and optionally add to vector store)
	uploadParams := clients.UploadFileParams{
		FilePath:      tempFilePath,
		Purpose:       purpose,
		VectorStoreID: vectorStoreID,
	}

	result, err := app.repositories.LlamaStackFiles.UploadFile(ctx, uploadParams)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	response := FileUploadResponse{
		Message:         "File uploaded successfully",
		FileID:          result.FileID,
		VectorStoreFile: result.VectorStoreFile,
	}

	if result.VectorStoreFile != nil {
		response.Message = "File uploaded and added to vector store successfully"
	}

	err = app.WriteJSON(w, http.StatusCreated, response, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
