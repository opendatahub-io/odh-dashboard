package llamastack

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestCategorizeResponseError(t *testing.T) {
	tests := []struct {
		name             string
		errorMessage     string
		expectedCategory ResponseErrorCategory
	}{
		// Model configuration errors
		{
			name:             "max_tokens exceeded",
			errorMessage:     "max_tokens value 10000 exceeds model maximum of 4096",
			expectedCategory: CategoryInvalidModelConfig,
		},
		{
			name:             "invalid max_tokens",
			errorMessage:     "max_tokens invalid: must be greater than 0",
			expectedCategory: CategoryInvalidModelConfig,
		},
		{
			name:             "chat_template not found",
			errorMessage:     "chat_template 'custom' not found for model llama-3.1-8b",
			expectedCategory: CategoryInvalidModelConfig,
		},
		{
			name:             "context length exceeded",
			errorMessage:     "Input prompt too long: context length exceeded (8192 tokens max)",
			expectedCategory: CategoryInvalidModelConfig,
		},
		{
			name:             "sequence too long",
			errorMessage:     "The sequence length is too long for the model: 12000 tokens",
			expectedCategory: CategoryInvalidModelConfig,
		},

		// Unsupported features
		{
			name:             "tools not supported",
			errorMessage:     "Model does not support tool calling",
			expectedCategory: CategoryUnsupportedFeature,
		},
		{
			name:             "images not supported",
			errorMessage:     "This model does not support image inputs",
			expectedCategory: CategoryUnsupportedFeature,
		},
		{
			name:             "streaming not supported",
			errorMessage:     "Streaming is not supported for this model",
			expectedCategory: CategoryUnsupportedFeature,
		},
		{
			name:             "function calling unavailable",
			errorMessage:     "Function calling is not supported by this model",
			expectedCategory: CategoryUnsupportedFeature,
		},

		// Invalid parameters
		{
			name:             "temperature out of range",
			errorMessage:     "temperature must be between 0.0 and 2.0, got 3.5",
			expectedCategory: CategoryInvalidParameter,
		},
		{
			name:             "top_p invalid",
			errorMessage:     "top_p out of range: must be between 0.0 and 1.0",
			expectedCategory: CategoryInvalidParameter,
		},

		// RAG errors
		{
			name:             "vector store not found",
			errorMessage:     "Vector store 'vs_abc123' not found",
			expectedCategory: CategoryRAGVectorStoreNotFound,
		},
		{
			name:             "vectorstore does not exist",
			errorMessage:     "vectorstore does not exist: vs_test",
			expectedCategory: CategoryRAGVectorStoreNotFound,
		},
		{
			name:             "embedding error",
			errorMessage:     "Embedding service failed: connection refused",
			expectedCategory: CategoryRAGError,
		},
		{
			name:             "vector search failed",
			errorMessage:     "Vector search failed: timeout waiting for results",
			expectedCategory: CategoryRAGError,
		},
		{
			name:             "retrieval error",
			errorMessage:     "Document retrieval failed: no documents found",
			expectedCategory: CategoryRAGError,
		},

		// Guardrails errors
		{
			name:             "shield not found",
			errorMessage:     "Shield 'custom_shield' not found",
			expectedCategory: CategoryGuardrailsError,
		},
		{
			name:             "guardrail error",
			errorMessage:     "Guardrail processing failed: TrustyAI service unavailable",
			expectedCategory: CategoryGuardrailsError,
		},
		{
			name:             "content blocked",
			errorMessage:     "Content blocked by guardrails: inappropriate language detected",
			expectedCategory: CategoryGuardrailsViolation,
		},
		{
			name:             "guardrail violation",
			errorMessage:     "Input rejected due to guardrail violation",
			expectedCategory: CategoryGuardrailsViolation,
		},

		// MCP errors
		{
			name:             "MCP tool not found",
			errorMessage:     "MCP tool 'search_web' not found on server",
			expectedCategory: CategoryMCPToolNotFound,
		},
		{
			name:             "MCP authentication failed",
			errorMessage:     "MCP authentication failed: invalid token",
			expectedCategory: CategoryMCPAuthError,
		},
		{
			name:             "tool authorization failed",
			errorMessage:     "Tool authorization failed: insufficient permissions",
			expectedCategory: CategoryMCPAuthError,
		},
		{
			name:             "tool execution failed",
			errorMessage:     "Tool execution failed: server returned error 500",
			expectedCategory: CategoryMCPError,
		},
		{
			name:             "MCP error generic",
			errorMessage:     "MCP error: unable to connect to server",
			expectedCategory: CategoryMCPError,
		},

		// Model invocation errors
		{
			name:             "request timeout",
			errorMessage:     "Request timed out after 30 seconds",
			expectedCategory: CategoryModelTimeout,
		},
		{
			name:             "deadline exceeded",
			errorMessage:     "Context deadline exceeded while waiting for response",
			expectedCategory: CategoryModelTimeout,
		},
		{
			name:             "model overloaded",
			errorMessage:     "Model is currently overloaded, please try again later",
			expectedCategory: CategoryModelOverloaded,
		},
		{
			name:             "too many requests",
			errorMessage:     "Too many requests: rate limit exceeded",
			expectedCategory: CategoryModelOverloaded,
		},
		{
			name:             "CUDA out of memory",
			errorMessage:     "CUDA out of memory: failed to allocate 2GB",
			expectedCategory: CategoryModelOverloaded,
		},
		{
			name:             "OOM error",
			errorMessage:     "OOM: Out of memory on GPU device 0",
			expectedCategory: CategoryModelOverloaded,
		},
		{
			name:             "model not found",
			errorMessage:     "Model 'llama-3.1-405b' not found or not loaded",
			expectedCategory: CategoryModelInvocationError,
		},

		// Generic errors
		{
			name:             "unknown error",
			errorMessage:     "Something went wrong",
			expectedCategory: CategoryGenericError,
		},
		{
			name:             "empty error message",
			errorMessage:     "",
			expectedCategory: CategoryGenericError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			category := CategorizeResponseError(tt.errorMessage)
			assert.Equal(t, tt.expectedCategory, category,
				"Expected category %s but got %s for error: %s",
				tt.expectedCategory, category, tt.errorMessage)
		})
	}
}

func TestGetUserFriendlyErrorMessage(t *testing.T) {
	tests := []struct {
		name           string
		category       ResponseErrorCategory
		originalError  string
		expectContains []string
	}{
		{
			name:           "invalid model config",
			category:       CategoryInvalidModelConfig,
			originalError:  "max_tokens exceeds limit",
			expectContains: []string{"configuration is invalid", "max_tokens", "chat_template"},
		},
		{
			name:           "unsupported feature",
			category:       CategoryUnsupportedFeature,
			originalError:  "tools not supported",
			expectContains: []string{"does not support", "different model"},
		},
		{
			name:           "RAG vector store not found",
			category:       CategoryRAGVectorStoreNotFound,
			originalError:  "vector store not found",
			expectContains: []string{"vector store", "not found", "verify"},
		},
		{
			name:           "guardrails error",
			category:       CategoryGuardrailsError,
			originalError:  "shield unavailable",
			expectContains: []string{"Guardrails", "configuration"},
		},
		{
			name:           "MCP tool not found",
			category:       CategoryMCPToolNotFound,
			originalError:  "tool not found",
			expectContains: []string{"MCP tool", "not found", "verify"},
		},
		{
			name:           "model timeout",
			category:       CategoryModelTimeout,
			originalError:  "request timed out",
			expectContains: []string{"timed out", "overloaded", "try again"},
		},
		{
			name:           "model overloaded",
			category:       CategoryModelOverloaded,
			originalError:  "too many requests",
			expectContains: []string{"overloaded", "resources", "try again"},
		},
		{
			name:           "generic error with message",
			category:       CategoryGenericError,
			originalError:  "unexpected error occurred",
			expectContains: []string{"unexpected error occurred"},
		},
		{
			name:           "generic error empty message",
			category:       CategoryGenericError,
			originalError:  "",
			expectContains: []string{"unexpected error", "try again", "support"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			message := GetUserFriendlyErrorMessage(tt.category, tt.originalError)
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
			name: "configuration error",
			baseError: &LlamaStackError{
				Code:       ErrCodeInvalidRequest,
				Message:    "max_tokens value 10000 exceeds model maximum",
				StatusCode: 400,
			},
			expectedCategory: CategoryInvalidModelConfig,
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
