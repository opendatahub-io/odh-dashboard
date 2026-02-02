package maas

import (
	"fmt"
)

// MaaSError represents MaaS-specific errors
type MaaSError struct {
	Code       string `json:"code"`
	Message    string `json:"message"`
	ServerURL  string `json:"server_url,omitempty"`
	StatusCode int    `json:"-"`
}

func (e *MaaSError) Error() string {
	if e.ServerURL != "" {
		return fmt.Sprintf("MaaS error [%s] for server %s: %s", e.Code, e.ServerURL, e.Message)
	}
	return fmt.Sprintf("MaaS error [%s]: %s", e.Code, e.Message)
}

// MaaS error codes
const (
	ErrCodeConnectionFailed  = "CONNECTION_FAILED"
	ErrCodeTimeout           = "TIMEOUT"
	ErrCodeInvalidResponse   = "INVALID_RESPONSE"
	ErrCodeServerUnavailable = "SERVER_UNAVAILABLE"
	ErrCodeUnauthorized      = "UNAUTHORIZED"
	ErrCodeInvalidConfig     = "INVALID_CONFIG"
	ErrCodeInternalError     = "INTERNAL_ERROR"
)

// NewMaaSError creates a new MaaS error
func NewMaaSError(code, message string, statusCode int) *MaaSError {
	return &MaaSError{
		Code:       code,
		Message:    message,
		StatusCode: statusCode,
	}
}

// NewMaaSErrorWithServer creates a new MaaS error with server URL
func NewMaaSErrorWithServer(code, message, serverURL string, statusCode int) *MaaSError {
	return &MaaSError{
		Code:       code,
		Message:    message,
		ServerURL:  serverURL,
		StatusCode: statusCode,
	}
}

// NewConnectionError creates a connection-related error
func NewConnectionError(serverURL, message string) *MaaSError {
	return NewMaaSErrorWithServer(ErrCodeConnectionFailed, message, serverURL, 503)
}

// NewTimeoutError creates a timeout error
func NewTimeoutError(serverURL string) *MaaSError {
	return NewMaaSErrorWithServer(ErrCodeTimeout, "Request timed out", serverURL, 408)
}

// NewInvalidResponseError creates an invalid response error
func NewInvalidResponseError(serverURL, message string) *MaaSError {
	return NewMaaSErrorWithServer(ErrCodeInvalidResponse, message, serverURL, 502)
}

// NewServerUnavailableError creates a server unavailable error
func NewServerUnavailableError(serverURL string) *MaaSError {
	return NewMaaSErrorWithServer(ErrCodeServerUnavailable, "MaaS service is not available", serverURL, 503)
}
