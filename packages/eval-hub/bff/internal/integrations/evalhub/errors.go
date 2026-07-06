package evalhub

import (
	"errors"
	"fmt"
	"net/http"
	"net/url"
)

type httpError struct {
	StatusCode int
	Body       string
}

func (e *httpError) Error() string {
	return fmt.Sprintf("HTTP %d: %s", e.StatusCode, e.Body)
}

// EvalHubError represents EvalHub-specific errors.
type EvalHubError struct {
	Code       string `json:"code"`
	Message    string `json:"message"`
	StatusCode int    `json:"-"`
}

func (e *EvalHubError) Error() string {
	return fmt.Sprintf("EvalHub error [%s]: %s", e.Code, e.Message)
}

const (
	ErrCodeConnectionFailed  = "CONNECTION_FAILED"
	ErrCodeServerUnavailable = "SERVER_UNAVAILABLE"
	ErrCodeUnauthorized      = "UNAUTHORIZED"
	ErrCodeInvalidRequest    = "INVALID_REQUEST"
	ErrCodeNotFound          = "NOT_FOUND"
	ErrCodeInternalError     = "INTERNAL_ERROR"
)

func NewEvalHubError(code, message string, statusCode int) *EvalHubError {
	return &EvalHubError{
		Code:       code,
		Message:    message,
		StatusCode: statusCode,
	}
}

func NewConnectionError(message string) *EvalHubError {
	return NewEvalHubError(ErrCodeConnectionFailed, message, 502)
}

func NewServerUnavailableError(message string) *EvalHubError {
	return NewEvalHubError(ErrCodeServerUnavailable, message, 503)
}

func NewUnauthorizedError(message string) *EvalHubError {
	return NewEvalHubError(ErrCodeUnauthorized, message, 401)
}

func NewInvalidRequestError(message string) *EvalHubError {
	return NewEvalHubError(ErrCodeInvalidRequest, message, 400)
}

func NewNotFoundError(message string) *EvalHubError {
	return NewEvalHubError(ErrCodeNotFound, message, 404)
}
func wrapClientError(err error, operation string) *EvalHubError {
	if err == nil {
		return nil
	}

	var urlErr *url.Error
	if errors.As(err, &urlErr) {
		message := fmt.Sprintf("failed to connect to EvalHub server on operation %s: %s", operation, urlErr.Err.Error())
		return NewConnectionError(message)
	}

	// HTTP-level errors (non-2xx responses from the EvalHub service)
	var httpErr *httpError
	if errors.As(err, &httpErr) {
		body := httpErr.Body
		if body == "" {
			body = fmt.Sprintf("HTTP %d", httpErr.StatusCode)
		}
		message := fmt.Sprintf("EvalHub error on operation %s: %s", operation, body)

		switch httpErr.StatusCode {
		case http.StatusBadRequest:
			return NewInvalidRequestError(message)
		case http.StatusUnauthorized:
			return NewUnauthorizedError(message)
		case http.StatusNotFound:
			return NewNotFoundError(message)
		case http.StatusServiceUnavailable, http.StatusGatewayTimeout, http.StatusRequestTimeout:
			return NewServerUnavailableError(message)
		default:
			return NewEvalHubError(ErrCodeInternalError, message, httpErr.StatusCode)
		}
	}

	// Catch-all for unexpected errors
	return NewEvalHubError(ErrCodeInternalError, fmt.Sprintf("unexpected error on operation %s: %s", operation, err.Error()), 0)
}
