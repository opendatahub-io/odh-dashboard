package helper

import (
	"fmt"
	"log/slog"
	"net/http"
	"strings"
)

// extractMultipartFormData processes a multipart form request and returns a description of its contents
// without reading the entire file contents into memory. It only reads headers to extract filenames.
func extractMultipartFormData(r *http.Request) (string, error) {
	if err := r.ParseMultipartForm(32 << 20); err != nil { // 32MB max memory
		return "", fmt.Errorf("failed to parse multipart form: %w", err)
	}

	// Create a buffer to store filenames
	var fileNames []string

	// Collect filenames from the parsed form
	if r.MultipartForm != nil && r.MultipartForm.File != nil {
		for field, files := range r.MultipartForm.File {
			for _, fileHeader := range files {
				fileNames = append(fileNames, fmt.Sprintf("%s:%s", field, fileHeader.Filename))
			}
		}
	}

	if len(fileNames) > 0 {
		return fmt.Sprintf("[multipart/form-data request with files: %s]", strings.Join(fileNames, ", ")), nil
	}
	return "[multipart/form-data request - no files]", nil
}

// formatRequestBody returns a string representation of the request body based on its content type
func formatRequestBody(r *http.Request) slog.Value {
	if r.Body == nil {
		return slog.StringValue("")
	}

	contentType := r.Header.Get("Content-Type")
	if strings.HasPrefix(contentType, "multipart/form-data") {
		description, err := extractMultipartFormData(r)
		if err != nil {
			return slog.StringValue(fmt.Sprintf("[multipart/form-data request - %v]", err))
		}
		return slog.StringValue(description)
	}

	// For other types, log the full body
	cloneBody, err := CloneBody(r)
	if err != nil {
		return slog.StringValue(fmt.Sprintf("error: %v", err))
	}
	return slog.StringValue(string(cloneBody))
}
