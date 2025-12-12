package llamastack

import (
	"fmt"
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
