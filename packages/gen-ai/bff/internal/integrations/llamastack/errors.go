package llamastack

import (
	"errors"
	"fmt"
	"net/http"
	"net/url"

	"github.com/openai/openai-go/v2"
)

// LlamaStackError represents LlamaStack-specific errors
type LlamaStackError struct {
	Code       string      `json:"code"`
	Message    string      `json:"message"`
	ServiceURL string      `json:"service_url,omitempty"`
	StatusCode int         `json:"-"`
	Metadata   interface{} `json:"-"` // Optional metadata for debugging (params, context, etc.)
}

func (e *LlamaStackError) Error() string {
	if e.ServiceURL != "" {
		return fmt.Sprintf("LlamaStack error [%s] for service %s: %s", e.Code, e.ServiceURL, e.Message)
	}
	return fmt.Sprintf("LlamaStack error [%s]: %s", e.Code, e.Message)
}

// LlamaStack error codes
const (
	ErrCodeConnectionFailed  = "CONNECTION_FAILED"
	ErrCodeTimeout           = "TIMEOUT"
	ErrCodeInvalidResponse   = "INVALID_RESPONSE"
	ErrCodeServerUnavailable = "SERVER_UNAVAILABLE"
	ErrCodeUnauthorized      = "UNAUTHORIZED"
	ErrCodeInvalidRequest    = "INVALID_REQUEST"
	ErrCodeModelNotFound     = "MODEL_NOT_FOUND"
	ErrCodeInternalError     = "INTERNAL_ERROR"
)

// NewLlamaStackError creates a new LlamaStack error
func NewLlamaStackError(code, message string, statusCode int) *LlamaStackError {
	return &LlamaStackError{
		Code:       code,
		Message:    message,
		StatusCode: statusCode,
	}
}

// NewLlamaStackErrorWithService creates a new LlamaStack error with service URL
func NewLlamaStackErrorWithService(code, message, serviceURL string, statusCode int) *LlamaStackError {
	return &LlamaStackError{
		Code:       code,
		Message:    message,
		ServiceURL: serviceURL,
		StatusCode: statusCode,
	}
}

// NewConnectionError creates a connection-related error
func NewConnectionError(serviceURL, message string) *LlamaStackError {
	return NewLlamaStackErrorWithService(ErrCodeConnectionFailed, message, serviceURL, 503)
}

// NewTimeoutError creates a timeout error
func NewTimeoutError(serviceURL string) *LlamaStackError {
	return NewLlamaStackErrorWithService(ErrCodeTimeout, "Request timed out", serviceURL, 408)
}

// NewInvalidResponseError creates an invalid response error
func NewInvalidResponseError(serviceURL, message string) *LlamaStackError {
	return NewLlamaStackErrorWithService(ErrCodeInvalidResponse, message, serviceURL, 502)
}

// NewServerUnavailableError creates a server unavailable error
func NewServerUnavailableError(serviceURL string) *LlamaStackError {
	return NewLlamaStackErrorWithService(ErrCodeServerUnavailable, "LlamaStack service is unavailable", serviceURL, 503)
}

// NewUnauthorizedError creates an unauthorized error
func NewUnauthorizedError(message string) *LlamaStackError {
	return NewLlamaStackError(ErrCodeUnauthorized, message, 401)
}

// NewInvalidRequestError creates an invalid request error
func NewInvalidRequestError(message string) *LlamaStackError {
	return NewLlamaStackError(ErrCodeInvalidRequest, message, 400)
}

// NewModelNotFoundError creates a model not found error
func NewModelNotFoundError(modelName string) *LlamaStackError {
	return NewLlamaStackError(ErrCodeModelNotFound, fmt.Sprintf("model '%s' not found or is not available", modelName), 404)
}

// wrapClientError wraps errors from the llamastack OpenAI client into our LlamaStackError type for consistent error handling.
// Network errors (connection refused, timeout) are wrapped as ConnectionError.
// API errors (openai.Error) are wrapped with appropriate error codes based on status.
// This ensures all errors can be handled uniformly by handleLlamaStackClientError.
// The operation parameter should be the function name or endpoint that failed (e.g. "ListModels", "CreateResponse").
// The optional metadata parameters can include request parameters, IDs, or other context for debugging.
// Multiple metadata items are combined into a slice; a single item is stored as-is.
func wrapClientError(err error, operation string, metadata ...interface{}) error {
	if err == nil {
		return nil
	}

	// Extract metadata if provided (supports 0 or more metadata arguments)
	var meta interface{}
	if len(metadata) > 0 {
		if len(metadata) == 1 {
			meta = metadata[0] // Single item - use as-is
		} else {
			meta = metadata // Multiple items - use the whole slice
		}
	}

	// Check for network-level errors (connection refused, timeout, DNS failures, etc.)
	var urlErr *url.Error
	if errors.As(err, &urlErr) {
		fmt.Printf("DEBUG wrapClientError: detected *url.Error\n")
		message := fmt.Sprintf("failed to connect to LlamaStack server while %s: %s", operation, urlErr.Err.Error())
		lsErr := NewConnectionError("LlamaStack server", message)
		lsErr.Metadata = meta
		return lsErr
	}

	// Check for API-level errors (status codes from LlamaStack service)
	var apiErr *openai.Error
	if errors.As(err, &apiErr) {
		// Prefix message with operation context for clarity
		message := fmt.Sprintf("LlamaStack error while %s: %s", operation, apiErr.Message)

		// Map openai.Error to LlamaStackError based on status code
		var lsErr *LlamaStackError
		switch apiErr.StatusCode {
		case http.StatusBadRequest:
			lsErr = NewInvalidRequestError(message)
		case http.StatusUnauthorized:
			lsErr = NewUnauthorizedError(message)
		case http.StatusNotFound:
			lsErr = NewModelNotFoundError(message)
		case http.StatusServiceUnavailable, http.StatusGatewayTimeout, http.StatusRequestTimeout:
			lsErr = NewServerUnavailableError(message)
		default:
			// For other API errors, return as internal error with original message
			lsErr = NewLlamaStackError(ErrCodeInternalError, message, apiErr.StatusCode)
		}
		lsErr.Metadata = meta
		return lsErr
	}

	// For other unknown errors, wrap as internal error
	lsErr := NewLlamaStackError(ErrCodeInternalError, fmt.Sprintf("unexpected error while %s: %s", operation, err.Error()), 0)
	lsErr.Metadata = meta
	return lsErr
}
