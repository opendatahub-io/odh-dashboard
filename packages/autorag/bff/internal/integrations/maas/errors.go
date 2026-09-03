package maas

import (
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
)

// MaaSError represents MaaS-specific errors
type MaaSError struct {
	Code       string `json:"code"`
	Message    string `json:"message"`
	StatusCode int    `json:"-"`
}

func (e *MaaSError) Error() string {
	return fmt.Sprintf("Models as a Service error [%s]: %s", e.Code, e.Message)
}

// Models as a Service error codes
const (
	ErrCodeConnectionFailed  = "CONNECTION_FAILED"
	ErrCodeTimeout           = "TIMEOUT"
	ErrCodeServerUnavailable = "SERVER_UNAVAILABLE"
	ErrCodeUnauthorized      = "UNAUTHORIZED"
	ErrCodeInvalidRequest    = "INVALID_REQUEST"
	ErrCodeNotFound          = "NOT_FOUND"
	ErrCodeInternalError     = "INTERNAL_ERROR"
)

func NewMaaSError(code, message string, statusCode int) *MaaSError {
	return &MaaSError{
		Code:       code,
		Message:    message,
		StatusCode: statusCode,
	}
}

func NewConnectionError(message string) *MaaSError {
	return NewMaaSError(ErrCodeConnectionFailed, message, 502)
}

func NewServerUnavailableError(message string) *MaaSError {
	return NewMaaSError(ErrCodeServerUnavailable, message, 503)
}

func NewUnauthorizedError(message string) *MaaSError {
	return NewMaaSError(ErrCodeUnauthorized, message, 401)
}

func NewInvalidRequestError(message string) *MaaSError {
	return NewMaaSError(ErrCodeInvalidRequest, message, 400)
}

func NewNotFoundError(message string) *MaaSError {
	return NewMaaSError(ErrCodeNotFound, message, 404)
}

// wrapClientError wraps Go errors from httpClient.Do() into our MaaSError type.
// It handles network-level errors (connection refused, timeout, DNS failures).
// For HTTP status code errors, use mapHTTPStatusToError instead.
// The operation parameter should be the function name that failed (e.g. "ListModels", "ListProviders").
func wrapClientError(err error, operation string) *MaaSError {
	if err == nil {
		return nil
	}

	// Check for network-level errors (connection refused, timeout, DNS failures, etc.)
	var urlErr *url.Error
	if errors.As(err, &urlErr) {
		message := fmt.Sprintf("failed to connect to Models as a Service server on operation %s: %s", operation, urlErr.Err.Error())
		return NewConnectionError(message)
	}

	// For other unknown errors, wrap as internal error
	return NewMaaSError(ErrCodeInternalError, fmt.Sprintf("unexpected error on operation %s: %s", operation, err.Error()), http.StatusInternalServerError)
}

// mapHTTPStatusToError maps a non-200 HTTP status code from Models as a Service into a typed MaaSError.
// The resource parameter describes what was being accessed (e.g. "models", "providers") for error messages.
func mapHTTPStatusToError(statusCode int, body []byte, resource string) *MaaSError {
	// Log a truncated, length-only summary of the upstream body for debugging.
	// Never log the raw payload — upstream responses may contain auth headers
	// echoed back, tokens in URLs, stack traces, or PII.
	slog.Debug("Models as a Service upstream error",
		"status", statusCode,
		"resource", resource,
		"bodyLen", len(body))

	switch statusCode {
	case http.StatusBadRequest:
		return NewInvalidRequestError(fmt.Sprintf("invalid request to Models as a Service %s (status %d)", resource, statusCode))
	case http.StatusUnauthorized:
		return NewUnauthorizedError(fmt.Sprintf("unauthorized to access Models as a Service %s", resource))
	case http.StatusNotFound:
		return NewNotFoundError(fmt.Sprintf("Models as a Service %s not found — ensure Models as a Service version supports /v1/%s", resource, resource))
	case http.StatusRequestTimeout, http.StatusGatewayTimeout:
		return NewMaaSError(ErrCodeTimeout,
			fmt.Sprintf("Models as a Service request timed out while listing %s", resource),
			statusCode)
	case http.StatusServiceUnavailable:
		return NewServerUnavailableError(fmt.Sprintf("Models as a Service service unavailable while listing %s", resource))
	default:
		return NewMaaSError(ErrCodeInternalError,
			fmt.Sprintf("unexpected status %d from Models as a Service %s", statusCode, resource),
			statusCode)
	}
}
