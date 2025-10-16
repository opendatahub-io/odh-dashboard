package validation

import (
	"fmt"
	"mime/multipart"
	"strings"
)

const (
	// maxFileSize is the maximum size for a single file (5MB)
	maxFileSize = 5 << 20
	// maxTotalSize is the maximum total size for all files combined (20MB)
	maxTotalSize = 20 << 20
)

// FileValidationError represents an error that occurred during file validation
type FileValidationError struct {
	Message   string
	Filename  string
	Size      int64
	TotalSize int64
	MIMEType  string
	ErrorType string // "size", "total_size", or "mime_type"
}

func (e *FileValidationError) Error() string {
	switch e.ErrorType {
	case "size":
		return fmt.Sprintf("file %s exceeds maximum size of %d bytes", e.Filename, maxFileSize)
	case "total_size":
		return fmt.Sprintf("total file size %d bytes exceeds maximum of %d bytes", e.TotalSize, maxTotalSize)
	case "mime_type":
		return fmt.Sprintf("unsupported file type %s for file %s", e.MIMEType, e.Filename)
	default:
		return e.Message
	}
}

// allowedMIMETypes defines the supported file types for in-context learning
var allowedMIMETypes = map[string]bool{
	"text/plain":               true,
	"text/markdown":            true,
	"application/json":         true,
	"application/pdf":          true,
	"application/vnd.ms-excel": true,
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": true,
}

// IsAllowedMIMEType checks if the given MIME type is supported
func IsAllowedMIMEType(contentType string) bool {
	// Extract base MIME type without parameters
	mimeType := strings.Split(contentType, ";")[0]
	return allowedMIMETypes[mimeType]
}

// ValidateFiles performs all necessary validations on uploaded files:
// - Individual file size limits
// - Total size limit for all files
// - MIME type validation
func ValidateFiles(files []*multipart.FileHeader) error {
	// Calculate total size and validate individual files
	var totalSize int64
	for _, fileHeader := range files {
		// Check individual file size
		if fileHeader.Size > maxFileSize {
			return &FileValidationError{
				Filename:  fileHeader.Filename,
				Size:      fileHeader.Size,
				ErrorType: "size",
			}
		}
		totalSize += fileHeader.Size
	}

	// Check total size
	if totalSize > maxTotalSize {
		return &FileValidationError{
			TotalSize: totalSize,
			ErrorType: "total_size",
		}
	}

	// Validate MIME types
	for _, fileHeader := range files {
		contentType := fileHeader.Header.Get("Content-Type")
		if !IsAllowedMIMEType(contentType) {
			return &FileValidationError{
				Filename:  fileHeader.Filename,
				MIMEType:  contentType,
				ErrorType: "mime_type",
			}
		}
	}

	return nil
}
