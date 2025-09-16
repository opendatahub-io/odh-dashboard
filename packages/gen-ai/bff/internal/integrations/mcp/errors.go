package mcp

import (
	"fmt"
)

// MCPError represents MCP-specific errors
type MCPError struct {
	Code       string `json:"code"`
	Message    string `json:"message"`
	ServerURL  string `json:"server_url,omitempty"`
	StatusCode int    `json:"-"`
}

func (e *MCPError) Error() string {
	if e.ServerURL != "" {
		return fmt.Sprintf("MCP error [%s] for server %s: %s", e.Code, e.ServerURL, e.Message)
	}
	return fmt.Sprintf("MCP error [%s]: %s", e.Code, e.Message)
}

// MCP error codes
const (
	ErrCodeConnectionFailed  = "CONNECTION_FAILED"
	ErrCodeTimeout           = "TIMEOUT"
	ErrCodeInvalidResponse   = "INVALID_RESPONSE"
	ErrCodeServerUnavailable = "SERVER_UNAVAILABLE"
	ErrCodeUnauthorized      = "UNAUTHORIZED"
	ErrCodeInvalidConfig     = "INVALID_CONFIG"
	ErrCodeToolNotFound      = "TOOL_NOT_FOUND"
	ErrCodeInternalError     = "INTERNAL_ERROR"
)

// NewMCPError creates a new MCP error
func NewMCPError(code, message string, statusCode int) *MCPError {
	return &MCPError{
		Code:       code,
		Message:    message,
		StatusCode: statusCode,
	}
}

// NewMCPErrorWithServer creates a new MCP error with server URL
func NewMCPErrorWithServer(code, message, serverURL string, statusCode int) *MCPError {
	return &MCPError{
		Code:       code,
		Message:    message,
		ServerURL:  serverURL,
		StatusCode: statusCode,
	}
}

// NewConnectionError creates a connection-related error
func NewConnectionError(serverURL, message string) *MCPError {
	return NewMCPErrorWithServer(ErrCodeConnectionFailed, message, serverURL, 503)
}

// NewTimeoutError creates a timeout error
func NewTimeoutError(serverURL string) *MCPError {
	return NewMCPErrorWithServer(ErrCodeTimeout, "Request timed out", serverURL, 408)
}

// NewInvalidResponseError creates an invalid response error
func NewInvalidResponseError(serverURL, message string) *MCPError {
	return NewMCPErrorWithServer(ErrCodeInvalidResponse, message, serverURL, 502)
}

// NewServerUnavailableError creates a server unavailable error
func NewServerUnavailableError(serverURL string) *MCPError {
	return NewMCPErrorWithServer(ErrCodeServerUnavailable, "MCP server is unavailable", serverURL, 503)
}
