package llamastack

import (
	"regexp"
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

// ErrorPattern represents a pattern to match against error messages
type ErrorPattern struct {
	Pattern  *regexp.Regexp
	Category ResponseErrorCategory
}

// Common error patterns from LlamaStack, vLLM, and other components
var errorPatterns = []ErrorPattern{
	// Model configuration errors
	{regexp.MustCompile(`(?i)max_tokens.*invalid|max_tokens.*exceed|max_tokens.*too (large|small)`), CategoryInvalidModelConfig},
	{regexp.MustCompile(`(?i)chat_template.*not found|chat_template.*invalid|chat_template.*missing`), CategoryInvalidModelConfig},
	{regexp.MustCompile(`(?i)invalid.*sampling.*parameter|sampling.*out of range`), CategoryInvalidModelConfig},
	{regexp.MustCompile(`(?i)context.*length.*exceed|sequence.*too long|prompt.*too long`), CategoryInvalidModelConfig},

	// Unsupported features
	{regexp.MustCompile(`(?i)does not support.*tool|tool.*not supported|tools.*unavailable`), CategoryUnsupportedFeature},
	{regexp.MustCompile(`(?i)does not support.*image|image.*not supported|vision.*unavailable`), CategoryUnsupportedFeature},
	{regexp.MustCompile(`(?i)streaming.*not supported|cannot stream`), CategoryUnsupportedFeature},
	{regexp.MustCompile(`(?i)function.*calling.*not supported`), CategoryUnsupportedFeature},

	// Invalid parameters
	{regexp.MustCompile(`(?i)temperature.*invalid|temperature.*out of range|temperature.*between`), CategoryInvalidParameter},
	{regexp.MustCompile(`(?i)top_p.*invalid|top_p.*out of range`), CategoryInvalidParameter},
	{regexp.MustCompile(`(?i)invalid.*parameter|parameter.*validation.*failed`), CategoryInvalidParameter},
	{regexp.MustCompile(`(?i)\b(input|request body|body)\s+is\s+required\b`), CategoryInvalidParameter},
	{regexp.MustCompile(`(?i)missing\s+required\s+field`), CategoryInvalidParameter},
	{regexp.MustCompile(`(?i)\bmust\s+be\s+provided\b`), CategoryInvalidParameter},

	// RAG errors
	{regexp.MustCompile(`(?i)vector.*store.*not found|vectorstore.*does not exist`), CategoryRAGVectorStoreNotFound},
	{regexp.MustCompile(`(?i)embedding.*error|embedding.*failed|vector.*search.*failed`), CategoryRAGError},
	{regexp.MustCompile(`(?i)retrieval.*error|rag.*failed|document.*retrieval.*failed`), CategoryRAGError},

	// Guardrails errors
	{regexp.MustCompile(`(?i)shield.*not found|shield.*unavailable|guardrail.*not configured`), CategoryGuardrailsError},
	{regexp.MustCompile(`(?i)shield.*error|guardrail.*failed|moderation.*error`), CategoryGuardrailsError},
	{regexp.MustCompile(`(?i)content.*blocked|guardrail.*violation|input.*rejected`), CategoryGuardrailsViolation},

	// MCP errors (check these before model timeouts to avoid misclassification)
	{regexp.MustCompile(`(?i)tool.*not found|mcp.*tool.*unavailable`), CategoryMCPToolNotFound},
	{regexp.MustCompile(`(?i)mcp.*authentication|mcp.*unauthorized|tool.*authorization.*failed`), CategoryMCPAuthError},
	{regexp.MustCompile(`(?i)mcp.*(timeout|timed out)|tool.*(timeout|timed out)`), CategoryMCPError},
	{regexp.MustCompile(`(?i)mcp.*error|tool.*execution.*failed|tool.*invocation.*failed`), CategoryMCPError},

	// Model invocation errors (more specific timeout pattern to avoid matching connection/tool timeouts)
	{regexp.MustCompile(`(?i)(model|request|inference).*(timeout|timed out)|deadline exceeded`), CategoryModelTimeout},
	{regexp.MustCompile(`(?i)model.*overloaded|too many requests|rate.*limit|capacity.*exceeded`), CategoryModelOverloaded},
	{regexp.MustCompile(`(?i)model.*not found|model.*unavailable|model.*not loaded`), CategoryModelInvocationError},
	{regexp.MustCompile(`(?i)(cuda.*out of memory|\boom\b|memory.*allocation.*failed)`), CategoryModelOverloaded},
}

// CategorizeResponseError analyzes an error message and returns the most specific category
func CategorizeResponseError(errorMessage string) ResponseErrorCategory {
	if errorMessage == "" {
		return CategoryGenericError
	}

	// Check against all known patterns
	for _, pattern := range errorPatterns {
		if pattern.Pattern.MatchString(errorMessage) {
			return pattern.Category
		}
	}

	// Default to generic error
	return CategoryGenericError
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

	category := CategorizeResponseError(baseError.Message)
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
