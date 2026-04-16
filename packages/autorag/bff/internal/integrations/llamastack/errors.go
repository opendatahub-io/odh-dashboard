package llamastack

import (
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
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

// wrapClientError wraps Go errors from httpClient.Do() into our LlamaStackError type.
// It handles network-level errors (connection refused, timeout, DNS failures).
// For HTTP status code errors, use mapHTTPStatusToError instead.
// The operation parameter should be the function name that failed (e.g. "ListModels", "ListProviders").
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

	// For other unknown errors, wrap as internal error
	return NewLlamaStackError(ErrCodeInternalError, fmt.Sprintf("unexpected error on operation %s: %s", operation, err.Error()), http.StatusInternalServerError)
}

// mapHTTPStatusToError maps a non-200 HTTP status code from LlamaStack into a typed LlamaStackError.
// The resource parameter describes what was being accessed (e.g. "models", "providers") for error messages.
func mapHTTPStatusToError(statusCode int, body []byte, resource string) *LlamaStackError {
	// Log the raw upstream body server-side for debugging, but keep it out of
	// the error message returned to callers — upstream responses may contain
	// internal details, stack traces, or credentials.
	slog.Debug("LlamaStack upstream error",
		"status", statusCode,
		"resource", resource,
		"body", string(body))

	switch statusCode {
	case http.StatusBadRequest:
		return NewInvalidRequestError(fmt.Sprintf("invalid request to LlamaStack %s (status %d)", resource, statusCode))
	case http.StatusUnauthorized:
		return NewUnauthorizedError(fmt.Sprintf("unauthorized to access LlamaStack %s", resource))
	case http.StatusNotFound:
		return NewNotFoundError(fmt.Sprintf("LlamaStack %s not found — ensure LlamaStack version supports /v1/%s", resource, resource))
	case http.StatusRequestTimeout, http.StatusGatewayTimeout:
		return NewLlamaStackError(ErrCodeTimeout,
			fmt.Sprintf("LlamaStack request timed out while listing %s", resource),
			statusCode)
	case http.StatusServiceUnavailable:
		return NewServerUnavailableError(fmt.Sprintf("LlamaStack service unavailable while listing %s", resource))
	default:
		return NewLlamaStackError(ErrCodeInternalError,
			fmt.Sprintf("unexpected status %d from LlamaStack %s", statusCode, resource),
			statusCode)
	}
}
