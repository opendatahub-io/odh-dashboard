package ogx

import (
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
)

// OGXError represents OGX-specific errors
type OGXError struct {
	Code       string `json:"code"`
	Message    string `json:"message"`
	StatusCode int    `json:"-"`
}

func (e *OGXError) Error() string {
	return fmt.Sprintf("Open GenAI Stack error [%s]: %s", e.Code, e.Message)
}

// Open GenAI Stack error codes
const (
	ErrCodeConnectionFailed  = "CONNECTION_FAILED"
	ErrCodeTimeout           = "TIMEOUT"
	ErrCodeServerUnavailable = "SERVER_UNAVAILABLE"
	ErrCodeUnauthorized      = "UNAUTHORIZED"
	ErrCodeInvalidRequest    = "INVALID_REQUEST"
	ErrCodeNotFound          = "NOT_FOUND"
	ErrCodeInternalError     = "INTERNAL_ERROR"
)

func NewOGXError(code, message string, statusCode int) *OGXError {
	return &OGXError{
		Code:       code,
		Message:    message,
		StatusCode: statusCode,
	}
}

func NewConnectionError(message string) *OGXError {
	return NewOGXError(ErrCodeConnectionFailed, message, 502)
}

func NewServerUnavailableError(message string) *OGXError {
	return NewOGXError(ErrCodeServerUnavailable, message, 503)
}

func NewUnauthorizedError(message string) *OGXError {
	return NewOGXError(ErrCodeUnauthorized, message, 401)
}

func NewInvalidRequestError(message string) *OGXError {
	return NewOGXError(ErrCodeInvalidRequest, message, 400)
}

func NewNotFoundError(message string) *OGXError {
	return NewOGXError(ErrCodeNotFound, message, 404)
}

// wrapClientError wraps Go errors from httpClient.Do() into our OGXError type.
// It handles network-level errors (connection refused, timeout, DNS failures).
// For HTTP status code errors, use mapHTTPStatusToError instead.
// The operation parameter should be the function name that failed (e.g. "ListModels", "ListProviders").
func wrapClientError(err error, operation string) *OGXError {
	if err == nil {
		return nil
	}

	// Check for network-level errors (connection refused, timeout, DNS failures, etc.)
	var urlErr *url.Error
	if errors.As(err, &urlErr) {
		message := fmt.Sprintf("failed to connect to Open GenAI Stack server on operation %s: %s", operation, urlErr.Err.Error())
		return NewConnectionError(message)
	}

	// For other unknown errors, wrap as internal error
	return NewOGXError(ErrCodeInternalError, fmt.Sprintf("unexpected error on operation %s: %s", operation, err.Error()), http.StatusInternalServerError)
}

// mapHTTPStatusToError maps a non-200 HTTP status code from Open GenAI Stack into a typed OGXError.
// The resource parameter describes what was being accessed (e.g. "models", "providers") for error messages.
func mapHTTPStatusToError(statusCode int, body []byte, resource string) *OGXError {
	// Log a truncated, length-only summary of the upstream body for debugging.
	// Never log the raw payload — upstream responses may contain auth headers
	// echoed back, tokens in URLs, stack traces, or PII.
	slog.Debug("Open GenAI Stack upstream error",
		"status", statusCode,
		"resource", resource,
		"bodyLen", len(body))

	switch statusCode {
	case http.StatusBadRequest:
		return NewInvalidRequestError(fmt.Sprintf("invalid request to Open GenAI Stack %s (status %d)", resource, statusCode))
	case http.StatusUnauthorized:
		return NewUnauthorizedError(fmt.Sprintf("unauthorized to access Open GenAI Stack %s", resource))
	case http.StatusNotFound:
		return NewNotFoundError(fmt.Sprintf("Open GenAI Stack %s not found — ensure Open GenAI Stack version supports /v1/%s", resource, resource))
	case http.StatusRequestTimeout, http.StatusGatewayTimeout:
		return NewOGXError(ErrCodeTimeout,
			fmt.Sprintf("Open GenAI Stack request timed out while listing %s", resource),
			statusCode)
	case http.StatusServiceUnavailable:
		return NewServerUnavailableError(fmt.Sprintf("Open GenAI Stack service unavailable while listing %s", resource))
	default:
		return NewOGXError(ErrCodeInternalError,
			fmt.Sprintf("unexpected status %d from Open GenAI Stack %s", statusCode, resource),
			statusCode)
	}
}
