package externalmodels

import "fmt"

// ExternalModelError represents external model verification errors
type ExternalModelError struct {
	Code       string `json:"code"`
	Message    string `json:"message"`
	BaseURL    string `json:"base_url,omitempty"`
	ModelID    string `json:"model_id,omitempty"`
	StatusCode int    `json:"-"`
}

func (e *ExternalModelError) Error() string {
	if e.BaseURL != "" {
		return fmt.Sprintf("External model error [%s] for %s: %s",
			e.Code, e.BaseURL, e.Message)
	}
	return fmt.Sprintf("External model error [%s]: %s", e.Code, e.Message)
}

// Error codes
const (
	ErrCodeConnectionFailed     = "CONNECTION_FAILED"
	ErrCodeTimeout              = "TIMEOUT"
	ErrCodeUnauthorized         = "UNAUTHORIZED"
	ErrCodeNotOpenAICompatible  = "NOT_OPENAI_COMPATIBLE"
	ErrCodeInvalidConfiguration = "INVALID_CONFIGURATION"
)

// Constructor functions
func NewConnectionError(baseURL, message string) *ExternalModelError {
	return &ExternalModelError{
		Code:       ErrCodeConnectionFailed,
		Message:    message,
		BaseURL:    baseURL,
		StatusCode: 503,
	}
}

func NewTimeoutError(baseURL string) *ExternalModelError {
	return &ExternalModelError{
		Code:       ErrCodeTimeout,
		Message:    "Request timed out connecting to external model",
		BaseURL:    baseURL,
		StatusCode: 408,
	}
}

func NewUnauthorizedError(baseURL string) *ExternalModelError {
	return &ExternalModelError{
		Code:       ErrCodeUnauthorized,
		Message:    "API key is invalid or unauthorized",
		BaseURL:    baseURL,
		StatusCode: 401,
	}
}

func NewNotOpenAICompatibleError(baseURL, message string) *ExternalModelError {
	return &ExternalModelError{
		Code:       ErrCodeNotOpenAICompatible,
		Message:    message,
		BaseURL:    baseURL,
		StatusCode: 502,
	}
}

func NewInvalidConfigurationError(baseURL, message string) *ExternalModelError {
	return &ExternalModelError{
		Code:       ErrCodeInvalidConfiguration,
		Message:    message,
		BaseURL:    baseURL,
		StatusCode: 400,
	}
}
