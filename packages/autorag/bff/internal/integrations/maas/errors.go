package maas

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/url"
)

type MaaSError struct {
	Code       string
	Message    string
	StatusCode int
}

func (e *MaaSError) Error() string {
	return fmt.Sprintf("MaaS error [%s]: %s", e.Code, e.Message)
}

const (
	ErrCodeConnectionFailed  = "CONNECTION_FAILED"
	ErrCodeTimeout           = "TIMEOUT"
	ErrCodeServerUnavailable = "SERVER_UNAVAILABLE"
	ErrCodeUnauthorized      = "UNAUTHORIZED"
	ErrCodeForbidden         = "FORBIDDEN"
	ErrCodeInvalidRequest    = "INVALID_REQUEST"
	ErrCodeNotFound          = "NOT_FOUND"
	ErrCodeInternalError     = "INTERNAL_ERROR"
)

func NewMaaSError(code, message string, statusCode int) *MaaSError {
	return &MaaSError{Code: code, Message: message, StatusCode: statusCode}
}

func wrapMaaSClientError(err error) *MaaSError {
	if err == nil {
		return nil
	}
	var urlErr *url.Error
	if errors.As(err, &urlErr) {
		if errors.Is(urlErr.Err, context.DeadlineExceeded) {
			return NewMaaSError(ErrCodeTimeout, "MaaS request timed out", http.StatusServiceUnavailable)
		}
		return NewMaaSError(ErrCodeConnectionFailed, "failed to connect to MaaS", http.StatusBadGateway)
	}
	return NewMaaSError(ErrCodeInternalError, "unexpected MaaS client error", http.StatusInternalServerError)
}

func mapHTTPStatusToError(statusCode int) *MaaSError {
	switch statusCode {
	case http.StatusBadRequest:
		return NewMaaSError(ErrCodeInvalidRequest, "MaaS rejected the request", statusCode)
	case http.StatusUnauthorized:
		return NewMaaSError(ErrCodeUnauthorized, "MaaS authorization failed", statusCode)
	case http.StatusForbidden:
		return NewMaaSError(ErrCodeForbidden, "MaaS access was forbidden", statusCode)
	case http.StatusNotFound:
		return NewMaaSError(ErrCodeNotFound, "MaaS models endpoint was not found", statusCode)
	case http.StatusRequestTimeout, http.StatusGatewayTimeout:
		return NewMaaSError(ErrCodeTimeout, "MaaS request timed out", http.StatusServiceUnavailable)
	case http.StatusTooManyRequests, http.StatusServiceUnavailable:
		return NewMaaSError(ErrCodeServerUnavailable, "MaaS is temporarily unavailable", http.StatusServiceUnavailable)
	default:
		if statusCode >= http.StatusInternalServerError {
			return NewMaaSError(ErrCodeServerUnavailable, "MaaS is temporarily unavailable", http.StatusServiceUnavailable)
		}
		return NewMaaSError(ErrCodeInternalError, "unexpected MaaS response", statusCode)
	}
}
