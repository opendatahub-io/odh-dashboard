package llamastack

import (
	"strings"
)

// ResponseErrorCategory represents the category of error encountered when creating a response
type ResponseErrorCategory string

const (
	// Configuration errors
	CategoryInvalidModelConfig ResponseErrorCategory = "INVALID_MODEL_CONFIG" // max_tokens, chat_template, etc.
	CategoryUnsupportedFeature ResponseErrorCategory = "UNSUPPORTED_FEATURE"  // tools, images, streaming, etc.
	CategoryInvalidParameter   ResponseErrorCategory = "INVALID_PARAMETER"    // temperature out of range, etc.

	// RAG errors
	CategoryRAGError               ResponseErrorCategory = "RAG_ERROR" // Vector store, embeddings issues
	CategoryRAGVectorStoreNotFound ResponseErrorCategory = "RAG_VECTOR_STORE_NOT_FOUND"

	// Guardrails errors
	CategoryGuardrailsError     ResponseErrorCategory = "GUARDRAILS_ERROR"     // Shield errors
	CategoryGuardrailsViolation ResponseErrorCategory = "GUARDRAILS_VIOLATION" // Content blocked

	// MCP errors
	CategoryMCPError        ResponseErrorCategory = "MCP_ERROR" // Tool invocation errors
	CategoryMCPToolNotFound ResponseErrorCategory = "MCP_TOOL_NOT_FOUND"
	CategoryMCPAuthError    ResponseErrorCategory = "MCP_AUTH_ERROR"

	// Model invocation errors
	CategoryModelInvocationError ResponseErrorCategory = "MODEL_INVOCATION_ERROR" // LlamaStack errors
	CategoryModelTimeout         ResponseErrorCategory = "MODEL_TIMEOUT"
	CategoryModelOverloaded      ResponseErrorCategory = "MODEL_OVERLOADED"

	// General errors
	CategoryGenericError ResponseErrorCategory = "GENERIC_ERROR"
)

// CategorizeByErrorCode categorizes errors based on structured error codes from OpenAI-compatible APIs
// Categorization is based solely on error codes, types, and status codes - not message content
func CategorizeByErrorCode(errorCode, errorType, message string, statusCode int) ResponseErrorCategory {
	// Normalize error code for comparison (lowercase, replace hyphens/underscores)
	normalizedCode := strings.ToLower(strings.ReplaceAll(strings.ReplaceAll(errorCode, "-", "_"), " ", "_"))

	// Check error code first (most specific)
	switch normalizedCode {
	// Rate limiting and capacity errors
	case "rate_limit_exceeded", "insufficient_quota", "requests_per_minute_exceeded":
		return CategoryModelOverloaded

	// Invalid request errors - all default to invalid parameter
	case "invalid_request_error", "invalid_model", "invalid_parameter", "missing_required_field":
		return CategoryInvalidParameter

	// Timeout errors
	case "timeout", "request_timeout", "gateway_timeout":
		return CategoryModelTimeout

	// Model errors
	case "model_not_found", "model_unavailable", "model_error":
		return CategoryModelInvocationError

	// Resource not found errors - all map to generic error (llama_stack/server_error)
	case "resource_not_found", "vector_store_not_found":
		return CategoryGenericError

	// Tool/MCP errors
	case "tool_not_found", "tool_error", "mcp_error":
		return CategoryMCPError

	// Content policy violations
	case "content_policy_violation", "content_blocked", "guardrail_violation":
		return CategoryGuardrailsViolation

	// Server errors - all map to generic error (llama_stack/server_error)
	case "server_error", "internal_error", "service_unavailable":
		return CategoryGenericError
	}

	// Check error type as fallback
	switch strings.ToLower(errorType) {
	case "invalid_request_error":
		return CategoryInvalidParameter
	case "rate_limit_error":
		return CategoryModelOverloaded
	case "authentication_error", "permission_error":
		return CategoryGenericError // Auth errors are handled at higher level
	}

	// Check HTTP status code as last resort
	switch statusCode {
	case 429: // Too Many Requests
		return CategoryModelOverloaded
	case 400: // Bad Request
		return CategoryInvalidParameter
	case 404: // Not Found
		return CategoryGenericError
	case 503, 504: // Service Unavailable, Gateway Timeout
		return CategoryModelTimeout
	}

	return CategoryGenericError
}

// CategorizeResponseError categorizes errors using structured error codes from OpenAI-compatible APIs
func CategorizeResponseError(err *LlamaStackError) ResponseErrorCategory {
	if err == nil {
		return CategoryGenericError
	}

	return CategorizeByErrorCode(err.ErrorCode, err.Type, err.Message, err.StatusCode)
}

// GetUserFriendlyErrorMessage returns a user-friendly error message based on category and error code
// This provides guidance to users on how to fix the issue
func GetUserFriendlyErrorMessage(category ResponseErrorCategory, errorCode string) string {
	switch category {
	case CategoryInvalidModelConfig:
		return "The model configuration is invalid. Please check parameters like max_tokens, chat_template, or prompt length."

	case CategoryUnsupportedFeature:
		return "The selected model does not support this feature (e.g., tools, images, streaming). Please choose a different model or disable the unsupported feature."

	case CategoryInvalidParameter:
		return "One or more parameters are invalid. Please check temperature, top_p, and other model parameters."

	case CategoryRAGVectorStoreNotFound:
		return "The vector store was not found. Please verify that the vector store exists and you have access to it."

	case CategoryRAGError:
		return "An error occurred during retrieval augmented generation (RAG). Please check your vector store configuration and try again."

	case CategoryGuardrailsError:
		return "Guardrails service encountered an error. Please check the guardrails configuration or try disabling guardrails."

	case CategoryGuardrailsViolation:
		return "Content was blocked by guardrails. Please modify your input or adjust guardrails settings."

	case CategoryMCPToolNotFound:
		return "The requested MCP tool was not found. Please verify the tool name and server configuration."

	case CategoryMCPAuthError:
		return "MCP server authentication failed. Please check your MCP server credentials and permissions."

	case CategoryMCPError:
		return "An error occurred while invoking the MCP tool. Please check the tool configuration and try again."

	case CategoryModelTimeout:
		return "The model request timed out. The model may be overloaded or the request is too complex. Please try again or simplify your request."

	case CategoryModelOverloaded:
		return "The model is currently overloaded or out of resources. Please try again in a few moments."

	case CategoryModelInvocationError:
		return "An error occurred while invoking the model. Please check the model configuration and try again."

	default:
		// For generic errors, check if we can provide a more specific message based on error code
		switch errorCode {
		case ErrCodeUnauthorized:
			return "Your session is invalid. Please sign in again."
		case ErrCodeNotFound:
			return "The requested resource was not found. Please verify the resource exists."
		case ErrCodeConnectionFailed:
			return "Unable to connect to the service. Please check your connection and try again."
		case ErrCodeServerUnavailable:
			return "The service is temporarily unavailable. Please try again in a few moments."
		default:
			// Truly generic fallback
			return "An unexpected error occurred. Please try again or contact support if the issue persists."
		}
	}
}

// EnhancedLlamaStackError extends LlamaStackError with categorization
type EnhancedLlamaStackError struct {
	*LlamaStackError
	Category        ResponseErrorCategory `json:"category"`
	UserFriendlyMsg string                `json:"user_friendly_message"`
}

// NewEnhancedLlamaStackError creates an enhanced error with categorization
func NewEnhancedLlamaStackError(baseError *LlamaStackError) *EnhancedLlamaStackError {
	// Nil guard - return generic error if baseError is nil
	if baseError == nil {
		return &EnhancedLlamaStackError{
			LlamaStackError: &LlamaStackError{
				Code:    "UNKNOWN",
				Message: "Unknown error",
			},
			Category:        CategoryGenericError,
			UserFriendlyMsg: "An unexpected error occurred. Please try again or contact support if the issue persists.",
		}
	}

	// Use new categorization that prefers structured error codes
	category := CategorizeResponseError(baseError)
	userFriendlyMsg := GetUserFriendlyErrorMessage(category, baseError.Code)

	return &EnhancedLlamaStackError{
		LlamaStackError: baseError,
		Category:        category,
		UserFriendlyMsg: userFriendlyMsg,
	}
}

// Error implements the error interface
func (e *EnhancedLlamaStackError) Error() string {
	// Guard against nil receiver or nil embedded error
	if e == nil || e.LlamaStackError == nil {
		return "unknown error"
	}
	return e.LlamaStackError.Error()
}
