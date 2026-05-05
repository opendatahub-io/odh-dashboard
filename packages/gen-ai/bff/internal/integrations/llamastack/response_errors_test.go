package llamastack

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestCategorizeByErrorCode(t *testing.T) {
	tests := []struct {
		name             string
		errorCode        string
		errorType        string
		message          string
		statusCode       int
		expectedCategory ResponseErrorCategory
	}{
		// Rate limiting
		{
			name:             "rate limit exceeded",
			errorCode:        "rate_limit_exceeded",
			errorType:        "rate_limit_error",
			message:          "Rate limit exceeded for model",
			statusCode:       429,
			expectedCategory: CategoryModelOverloaded,
		},
		{
			name:             "insufficient quota",
			errorCode:        "insufficient_quota",
			errorType:        "rate_limit_error",
			message:          "You exceeded your quota",
			statusCode:       429,
			expectedCategory: CategoryModelOverloaded,
		},

		// Invalid requests - all map to CategoryInvalidParameter (message content no longer affects categorization)
		{
			name:             "invalid request with max_tokens in message",
			errorCode:        "invalid_request_error",
			errorType:        "invalid_request_error",
			message:          "max_tokens value exceeds limit",
			statusCode:       400,
			expectedCategory: CategoryInvalidParameter,
		},
		{
			name:             "invalid request with tools in message",
			errorCode:        "invalid_request_error",
			errorType:        "invalid_request_error",
			message:          "Model does not support tool calling",
			statusCode:       400,
			expectedCategory: CategoryInvalidParameter,
		},
		{
			name:             "invalid parameter generic",
			errorCode:        "invalid_parameter",
			errorType:        "invalid_request_error",
			message:          "temperature out of range",
			statusCode:       400,
			expectedCategory: CategoryInvalidParameter,
		},

		// Timeouts
		{
			name:             "timeout error",
			errorCode:        "timeout",
			errorType:        "server_error",
			message:          "Request timed out",
			statusCode:       504,
			expectedCategory: CategoryModelTimeout,
		},
		{
			name:             "gateway timeout",
			errorCode:        "gateway_timeout",
			errorType:        "server_error",
			message:          "Gateway timeout",
			statusCode:       504,
			expectedCategory: CategoryModelTimeout,
		},

		// Model errors
		{
			name:             "model not found",
			errorCode:        "model_not_found",
			errorType:        "invalid_request_error",
			message:          "Model 'llama-3' not found",
			statusCode:       404,
			expectedCategory: CategoryModelInvocationError,
		},

		// Vector store errors - all map to CategoryGenericError (message content no longer affects categorization)
		{
			name:             "vector store not found by code",
			errorCode:        "vector_store_not_found",
			errorType:        "resource_not_found",
			message:          "Vector store not found",
			statusCode:       404,
			expectedCategory: CategoryGenericError,
		},
		{
			name:             "resource not found with vector in message",
			errorCode:        "resource_not_found",
			errorType:        "not_found_error",
			message:          "vector store 'vs_123' not found",
			statusCode:       404,
			expectedCategory: CategoryGenericError,
		},

		// Content policy
		{
			name:             "content policy violation",
			errorCode:        "content_policy_violation",
			errorType:        "invalid_request_error",
			message:          "Content blocked by policy",
			statusCode:       400,
			expectedCategory: CategoryGuardrailsViolation,
		},

		// Server errors - all map to CategoryGenericError (message content no longer affects categorization)
		{
			name:             "server error with CUDA in message",
			errorCode:        "server_error",
			errorType:        "server_error",
			message:          "CUDA out of memory: failed to allocate 2.5 GB",
			statusCode:       500,
			expectedCategory: CategoryGenericError,
		},
		{
			name:             "internal error with OOM in message",
			errorCode:        "internal_error",
			errorType:        "server_error",
			message:          "OOM: insufficient memory",
			statusCode:       500,
			expectedCategory: CategoryGenericError,
		},

		// Fallback to status code
		{
			name:             "429 without error code",
			errorCode:        "",
			errorType:        "",
			message:          "Too many requests",
			statusCode:       429,
			expectedCategory: CategoryModelOverloaded,
		},
		{
			name:             "503 without error code",
			errorCode:        "",
			errorType:        "",
			message:          "Service unavailable",
			statusCode:       503,
			expectedCategory: CategoryModelTimeout,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			category := CategorizeByErrorCode(tt.errorCode, tt.errorType, tt.message, tt.statusCode)
			assert.Equal(t, tt.expectedCategory, category,
				"Expected category %s but got %s for error code: %s, type: %s, message: %s",
				tt.expectedCategory, category, tt.errorCode, tt.errorType, tt.message)
		})
	}
}

func TestGetUserFriendlyErrorMessage(t *testing.T) {
	tests := []struct {
		name           string
		category       ResponseErrorCategory
		errorCode      string
		expectContains []string
	}{
		{
			name:           "invalid model config",
			category:       CategoryInvalidModelConfig,
			errorCode:      "max_tokens exceeds limit",
			expectContains: []string{"configuration is invalid", "max_tokens", "chat_template"},
		},
		{
			name:           "unsupported feature",
			category:       CategoryUnsupportedFeature,
			errorCode:      "tools not supported",
			expectContains: []string{"does not support", "different model"},
		},
		{
			name:           "RAG vector store not found",
			category:       CategoryRAGVectorStoreNotFound,
			errorCode:      "vector store not found",
			expectContains: []string{"vector store", "not found", "verify"},
		},
		{
			name:           "guardrails error",
			category:       CategoryGuardrailsError,
			errorCode:      "shield unavailable",
			expectContains: []string{"Guardrails", "configuration"},
		},
		{
			name:           "MCP tool not found",
			category:       CategoryMCPToolNotFound,
			errorCode:      "tool not found",
			expectContains: []string{"MCP tool", "not found", "verify"},
		},
		{
			name:           "model timeout",
			category:       CategoryModelTimeout,
			errorCode:      "request timed out",
			expectContains: []string{"timed out", "overloaded", "try again"},
		},
		{
			name:           "model overloaded",
			category:       CategoryModelOverloaded,
			errorCode:      "too many requests",
			expectContains: []string{"overloaded", "resources", "try again"},
		},
		{
			name:           "generic error with unauthorized code",
			category:       CategoryGenericError,
			errorCode:      ErrCodeUnauthorized,
			expectContains: []string{"session is invalid", "sign in again"},
		},
		{
			name:           "generic error with not found code",
			category:       CategoryGenericError,
			errorCode:      ErrCodeNotFound,
			expectContains: []string{"requested resource was not found", "verify"},
		},
		{
			name:           "generic error with connection failed code",
			category:       CategoryGenericError,
			errorCode:      ErrCodeConnectionFailed,
			expectContains: []string{"Unable to connect", "check your connection"},
		},
		{
			name:           "generic error with server unavailable code",
			category:       CategoryGenericError,
			errorCode:      ErrCodeServerUnavailable,
			expectContains: []string{"temporarily unavailable", "try again"},
		},
		{
			name:           "generic error with unknown code",
			category:       CategoryGenericError,
			errorCode:      "UNKNOWN_CODE",
			expectContains: []string{"unexpected error", "try again", "support"},
		},
		{
			name:           "generic error empty code",
			category:       CategoryGenericError,
			errorCode:      "",
			expectContains: []string{"unexpected error", "try again", "support"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			message := GetUserFriendlyErrorMessage(tt.category, tt.errorCode)
			for _, expectedSubstring := range tt.expectContains {
				assert.Contains(t, message, expectedSubstring,
					"Expected message to contain '%s' but got: %s",
					expectedSubstring, message)
			}
		})
	}
}

func TestNewEnhancedLlamaStackError(t *testing.T) {
	tests := []struct {
		name             string
		baseError        *LlamaStackError
		expectedCategory ResponseErrorCategory
	}{
		{
			name: "invalid parameter error",
			baseError: &LlamaStackError{
				Code:       ErrCodeInvalidRequest,
				Message:    "max_tokens value 10000 exceeds model maximum",
				StatusCode: 400,
			},
			expectedCategory: CategoryInvalidParameter,
		},
		{
			name: "timeout error",
			baseError: &LlamaStackError{
				Code:       ErrCodeTimeout,
				Message:    "Request timed out after 30 seconds",
				StatusCode: 504,
			},
			expectedCategory: CategoryModelTimeout,
		},
		{
			name: "generic error",
			baseError: &LlamaStackError{
				Code:       ErrCodeInternalError,
				Message:    "Unknown internal error",
				StatusCode: 500,
			},
			expectedCategory: CategoryGenericError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			enhanced := NewEnhancedLlamaStackError(tt.baseError)

			assert.NotNil(t, enhanced)
			assert.Equal(t, tt.expectedCategory, enhanced.Category)
			assert.NotEmpty(t, enhanced.UserFriendlyMsg)
			assert.Equal(t, tt.baseError.Code, enhanced.Code)
			assert.Equal(t, tt.baseError.Message, enhanced.Message)
			assert.Equal(t, tt.baseError.StatusCode, enhanced.StatusCode)

			// Verify the error interface works
			errString := enhanced.Error()
			assert.Contains(t, errString, tt.baseError.Code)
			assert.Contains(t, errString, tt.baseError.Message)
		})
	}
}

func TestEnhancedLlamaStackErrorImplementsError(t *testing.T) {
	baseErr := &LlamaStackError{
		Code:       ErrCodeInvalidRequest,
		Message:    "test error",
		StatusCode: 400,
	}
	enhanced := NewEnhancedLlamaStackError(baseErr)

	// This compiles only if EnhancedLlamaStackError implements error interface
	var _ error = enhanced
}

func TestNewEnhancedLlamaStackErrorWithNil(t *testing.T) {
	// Test that nil input is handled gracefully
	enhanced := NewEnhancedLlamaStackError(nil)

	assert.NotNil(t, enhanced)
	assert.NotNil(t, enhanced.LlamaStackError)
	assert.Equal(t, CategoryGenericError, enhanced.Category)
	assert.Equal(t, "An unexpected error occurred. Please try again or contact support if the issue persists.", enhanced.UserFriendlyMsg)
	assert.Equal(t, "UNKNOWN", enhanced.Code)
	assert.Equal(t, "Unknown error", enhanced.Message)
}
