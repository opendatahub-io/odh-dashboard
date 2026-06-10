package connectionprobe

import "fmt"

const (
	ErrCodeConnectionFailed = "CONNECTION_FAILED"
	ErrCodeTimeout          = "TIMEOUT"
	ErrCodeUnauthorized     = "UNAUTHORIZED"
	ErrCodeForbidden        = "FORBIDDEN"
)

// ConnectionProbeError represents connection verification errors with typed error codes.
type ConnectionProbeError struct {
	Code       string `json:"code"`
	Message    string `json:"message"`
	BaseURL    string `json:"base_url,omitempty"`
	StatusCode int    `json:"-"`
}

func (e *ConnectionProbeError) Error() string {
	if e.BaseURL != "" {
		return fmt.Sprintf("Connection probe error [%s] for %s: %s",
			e.Code, e.BaseURL, e.Message)
	}
	return fmt.Sprintf("Connection probe error [%s]: %s", e.Code, e.Message)
}

func NewConnectionError(baseURL, message string) *ConnectionProbeError {
	return &ConnectionProbeError{
		Code:       ErrCodeConnectionFailed,
		Message:    message,
		BaseURL:    baseURL,
		StatusCode: 503,
	}
}

func NewTimeoutError(baseURL string) *ConnectionProbeError {
	return &ConnectionProbeError{
		Code:       ErrCodeTimeout,
		Message:    "Request timed out connecting to endpoint",
		BaseURL:    baseURL,
		StatusCode: 408,
	}
}

func NewUnauthorizedError(baseURL string) *ConnectionProbeError {
	return &ConnectionProbeError{
		Code:       ErrCodeUnauthorized,
		Message:    "API key is invalid or unauthorized",
		BaseURL:    baseURL,
		StatusCode: 401,
	}
}

func NewForbiddenError(baseURL string) *ConnectionProbeError {
	return &ConnectionProbeError{
		Code:       ErrCodeForbidden,
		Message:    "Access forbidden — insufficient permissions",
		BaseURL:    baseURL,
		StatusCode: 403,
	}
}
