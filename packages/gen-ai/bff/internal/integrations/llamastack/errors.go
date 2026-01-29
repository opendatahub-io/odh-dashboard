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
	StatusCode int    `json:"-"`
}

func (e *LlamaStackError) Error() string {
	return fmt.Sprintf("LlamaStack error [%s]: %s", e.Code, e.Message)
}

// LlamaStack error codes
const (
	ErrCodeConnectionFailed  = "CONNECTION_FAILED"
	ErrCodeTimeout           = "TIMEOUT"
	ErrCodeServerUnavailable = "SERVER_UNAVAILABLE"
	ErrCodeUnauthorized      = "UNAUTHORIZED"
	ErrCodeInvalidRequest    = "INVALID_REQUEST"
	ErrCodeNotFound          = "NOT_FOUND"
	ErrCodeInternalError     = "INTERNAL_ERROR"
)

func NewLlamaStackError(code, message string, statusCode int) *LlamaStackError {
	return &LlamaStackError{
		Code:       code,
		Message:    message,
		StatusCode: statusCode,
	}
}

func NewConnectionError(message string) *LlamaStackError {
	return NewLlamaStackError(ErrCodeConnectionFailed, message, 502)
}

func NewServerUnavailableError(message string) *LlamaStackError {
	return NewLlamaStackError(ErrCodeServerUnavailable, message, 503)
}

func NewUnauthorizedError(message string) *LlamaStackError {
	return NewLlamaStackError(ErrCodeUnauthorized, message, 401)
}

func NewInvalidRequestError(message string) *LlamaStackError {
	return NewLlamaStackError(ErrCodeInvalidRequest, message, 400)
}

func NewNotFoundError(message string) *LlamaStackError {
	return NewLlamaStackError(ErrCodeNotFound, message, 404)
}

// wrapClientError wraps errors from the llamastack OpenAI client into our LlamaStackError type for consistent error handling.
// Network errors (connection refused, timeout) are wrapped as ConnectionError.
// API errors (openai.Error) are wrapped with appropriate error codes based on status.
// This ensures all errors can be handled uniformly by handleLlamaStackClientError.
// The operation parameter should be the function name that failed (e.g. "ListModels", "CreateResponse").
func wrapClientError(err error, operation string) *LlamaStackError {
	if err == nil {
		return nil
	}

	// Check for network-level errors (connection refused, timeout, DNS failures, etc.)
	var urlErr *url.Error
	if errors.As(err, &urlErr) {
		message := fmt.Sprintf("failed to connect to LlamaStack server on operation %s: %s", operation, urlErr.Err.Error())
		return NewConnectionError(message)
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
