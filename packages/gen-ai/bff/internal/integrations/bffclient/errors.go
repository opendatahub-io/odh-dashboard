package bffclient

import (
	"fmt"
)

// BFFClientError represents BFF client-specific errors
type BFFClientError struct {
	Code       string    `json:"code"`
	Message    string    `json:"message"`
	Target     BFFTarget `json:"target,omitempty"`
	StatusCode int       `json:"-"`
}

func (e *BFFClientError) Error() string {
	if e.Target != "" {
		return fmt.Sprintf("BFF client error [%s] for target %s: %s", e.Code, e.Target, e.Message)
	}
	return fmt.Sprintf("BFF client error [%s]: %s", e.Code, e.Message)
}

// BFF client error codes
const (
	ErrCodeConnectionFailed  = "CONNECTION_FAILED"
	ErrCodeTimeout           = "TIMEOUT"
	ErrCodeInvalidResponse   = "INVALID_RESPONSE"
	ErrCodeServerUnavailable = "SERVER_UNAVAILABLE"
	ErrCodeUnauthorized      = "UNAUTHORIZED"
	ErrCodeForbidden         = "FORBIDDEN"
	ErrCodeNotFound          = "NOT_FOUND"
	ErrCodeBadRequest        = "BAD_REQUEST"
	ErrCodeInternalError     = "INTERNAL_ERROR"
	ErrCodeNotConfigured     = "NOT_CONFIGURED"
)

// NewBFFClientError creates a new BFF client error
func NewBFFClientError(code, message string, statusCode int) *BFFClientError {
	return &BFFClientError{
		Code:       code,
		Message:    message,
		StatusCode: statusCode,
	}
}

// NewBFFClientErrorWithTarget creates a new BFF client error with target information
func NewBFFClientErrorWithTarget(code, message string, target BFFTarget, statusCode int) *BFFClientError {
	return &BFFClientError{
		Code:       code,
		Message:    message,
		Target:     target,
		StatusCode: statusCode,
	}
}

// NewConnectionError creates a connection-related error
func NewConnectionError(target BFFTarget, message string) *BFFClientError {
	return NewBFFClientErrorWithTarget(ErrCodeConnectionFailed, message, target, 503)
}

// NewTimeoutError creates a timeout error
func NewTimeoutError(target BFFTarget) *BFFClientError {
	return NewBFFClientErrorWithTarget(ErrCodeTimeout, "Request to target BFF timed out", target, 408)
}

// NewInvalidResponseError creates an invalid response error
func NewInvalidResponseError(target BFFTarget, message string) *BFFClientError {
	return NewBFFClientErrorWithTarget(ErrCodeInvalidResponse, message, target, 502)
}

// NewServerUnavailableError creates a server unavailable error
func NewServerUnavailableError(target BFFTarget) *BFFClientError {
	return NewBFFClientErrorWithTarget(ErrCodeServerUnavailable, "Target BFF service is not available", target, 503)
}

// NewUnauthorizedError creates an unauthorized error
func NewUnauthorizedError(target BFFTarget, message string) *BFFClientError {
	return NewBFFClientErrorWithTarget(ErrCodeUnauthorized, message, target, 401)
}

// NewForbiddenError creates a forbidden error
func NewForbiddenError(target BFFTarget, message string) *BFFClientError {
	return NewBFFClientErrorWithTarget(ErrCodeForbidden, message, target, 403)
}

// NewNotFoundError creates a not found error
func NewNotFoundError(target BFFTarget, message string) *BFFClientError {
	return NewBFFClientErrorWithTarget(ErrCodeNotFound, message, target, 404)
}

// NewBadRequestError creates a bad request error
func NewBadRequestError(target BFFTarget, message string) *BFFClientError {
	return NewBFFClientErrorWithTarget(ErrCodeBadRequest, message, target, 400)
}

// NewNotConfiguredError creates an error for when a target BFF is not configured
func NewNotConfiguredError(target BFFTarget) *BFFClientError {
	return NewBFFClientErrorWithTarget(ErrCodeNotConfigured, fmt.Sprintf("Target BFF %s is not configured", target), target, 503)
}
