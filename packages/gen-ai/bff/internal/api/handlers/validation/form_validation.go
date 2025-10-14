package validation

import (
	"encoding/json"
	"fmt"
	"mime/multipart"
	"net/http"
	"strings"
)

// RequestData represents the parsed data from a multipart form request
type RequestData struct {
	Files   []*multipart.FileHeader
	Request interface{}
}

// ValidateMultipartFormRequest validates and parses a multipart form request
func ValidateMultipartFormRequest(r *http.Request, request interface{}) (*RequestData, error) {
	// Parse multipart form with reasonable size limit
	err := r.ParseMultipartForm(32 << 20) // 32MB max memory
	if err != nil {
		return nil, fmt.Errorf("failed to parse multipart form: %w", err)
	}

	// Get files from the form
	var files []*multipart.FileHeader
	if formFiles := r.MultipartForm.File["files"]; len(formFiles) > 0 {
		if err := ValidateFiles(formFiles); err != nil {
			return nil, err
		}
		files = formFiles
	}

	// Parse JSON request data from form field
	jsonData := r.FormValue("request")
	if jsonData == "" {
		return nil, fmt.Errorf("request field is required for multipart form data")
	}

	if err := json.NewDecoder(strings.NewReader(jsonData)).Decode(request); err != nil {
		return nil, fmt.Errorf("invalid request JSON: %w", err)
	}

	return &RequestData{
		Files:   files,
		Request: request,
	}, nil
}
