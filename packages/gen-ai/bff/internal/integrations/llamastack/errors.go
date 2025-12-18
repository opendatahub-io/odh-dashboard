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
	Code       string `json:"code"`
	Message    string `json:"message"`
	ServiceURL string `json:"service_url,omitempty"`
	StatusCode int    `json:"-"`
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
	ErrCodeNotFound          = "NOT_FOUND"
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

// NewNotFoundError creates a not found error
func NewNotFoundError(message string) *LlamaStackError {
	return NewLlamaStackError(ErrCodeNotFound, message, 404)
}

// wrapClientError wraps errors from the llamastack OpenAI client into our LlamaStackError type for consistent error handling.
// Network errors (connection refused, timeout) are wrapped as ConnectionError.
// API errors (openai.Error) are wrapped with appropriate error codes based on status.
// This ensures all errors can be handled uniformly by handleLlamaStackClientError.
// The operation parameter should be the function name that failed (e.g. "ListModels", "CreateResponse").
func wrapClientError(err error, operation string) error {
	if err == nil {
		return nil
	}

	// Check for network-level errors (connection refused, timeout, DNS failures, etc.)
	var urlErr *url.Error
	if errors.As(err, &urlErr) {
		message := fmt.Sprintf("failed to connect to LlamaStack server on operation %s: %s", operation, urlErr.Err.Error())
		return NewConnectionError("LlamaStack server", message)
	}

	// Check for API-level errors (status codes from LlamaStack service)
	var apiErr *openai.Error
	if errors.As(err, &apiErr) {
		llamastackErrorMsg := apiErr.Message
		if llamastackErrorMsg == "" {
			// if the error message is empty, fall back to the full error string
			llamastackErrorMsg = apiErr.Error()
		}

		// Prefix message with operation context for clarity
		message := fmt.Sprintf("LlamaStack error on operation %s: %s", operation, llamastackErrorMsg)

		// Map openai.Error to LlamaStackError based on status code
		switch apiErr.StatusCode {
		case http.StatusBadRequest:
			return NewInvalidRequestError(message)
		case http.StatusUnauthorized:
			return NewUnauthorizedError(message)
		case http.StatusNotFound:
			return NewNotFoundError(message)
		case http.StatusServiceUnavailable, http.StatusGatewayTimeout, http.StatusRequestTimeout:
			return NewServerUnavailableError(message)
		default:
			// For other API errors, return as internal error with original message
			return NewLlamaStackError(ErrCodeInternalError, message, apiErr.StatusCode)
		}
	}

	// For other unknown errors, wrap as internal error
	return NewLlamaStackError(ErrCodeInternalError, fmt.Sprintf("unexpected error on operation %s: %s", operation, err.Error()), 0)
}
