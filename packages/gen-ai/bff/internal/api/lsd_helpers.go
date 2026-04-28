package api

import (
	"net/http"

	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack"
)

// handleLlamaStackClientError maps LlamaStack client errors to appropriate HTTP status codes and sends the response
func (app *App) handleLlamaStackClientError(w http.ResponseWriter, r *http.Request, err error) {
	if llamastackErr, ok := err.(*llamastack.LlamaStackError); ok {
		statusCode := llamastackErr.StatusCode
		if statusCode == 0 {
			statusCode = app.getDefaultStatusCodeForLlamaStackClientError(llamastackErr.Code)
		}

		frontendErr := app.mapLlamaStackClientErrorToFrontendError(llamastackErr, statusCode)

		// Send frontend-compatible error response
		if writeErr := app.WriteJSON(w, frontendErr.Status, frontendErr, nil); writeErr != nil {
			app.LogError(r, writeErr)
			w.WriteHeader(frontendErr.Status)
		}
		return
	}

	// Fall back to generic error for unknown error types
	app.serverErrorResponse(w, r, err)
}

// getDefaultStatusCodeForLlamaStackClientError returns default HTTP status codes for LlamaStackError codes
func (app *App) getDefaultStatusCodeForLlamaStackClientError(errorCode string) int {
	switch errorCode {
	case llamastack.ErrCodeInvalidRequest:
		return http.StatusBadRequest
	case llamastack.ErrCodeUnauthorized:
		return http.StatusUnauthorized
	case llamastack.ErrCodeNotFound:
		return http.StatusNotFound
	case llamastack.ErrCodeConnectionFailed:
		return http.StatusBadGateway
	case llamastack.ErrCodeTimeout, llamastack.ErrCodeServerUnavailable:
		return http.StatusServiceUnavailable
	default:
		return http.StatusInternalServerError
	}
}

// categoryToFrontendError maps ResponseErrorCategory to frontend-expected error structure
func categoryToFrontendError(category llamastack.ResponseErrorCategory) (component, code string, retriable bool) {
	switch category {
	// Model timeout and overload - retriable
	case llamastack.CategoryModelTimeout:
		return "llama_stack", "timeout", true
	case llamastack.CategoryModelOverloaded:
		return "llama_stack", "rate_limit", true

	// RAG errors
	case llamastack.CategoryRAGError:
		return "rag", "unreachable", true
	case llamastack.CategoryRAGVectorStoreNotFound:
		return "rag", "not_found", false

	// Guardrails errors
	case llamastack.CategoryGuardrailsError:
		return "guardrails", "unreachable", true
	case llamastack.CategoryGuardrailsViolation:
		return "guardrails", "content_blocked", false

	// MCP errors
	case llamastack.CategoryMCPError:
		return "mcp", "unreachable", true
	case llamastack.CategoryMCPToolNotFound:
		return "mcp", "not_found", false
	case llamastack.CategoryMCPAuthError:
		return "mcp", "unauthorized", false

	// Model configuration and validation errors - not retriable
	case llamastack.CategoryInvalidModelConfig:
		return "model", "invalid_model_config", false
	case llamastack.CategoryUnsupportedFeature:
		return "model", "unsupported_feature", false
	case llamastack.CategoryInvalidParameter:
		return "model", "invalid_parameter", false

	// Model invocation errors
	case llamastack.CategoryModelInvocationError:
		return "llama_stack", "server_error", true

	// Generic/unknown errors - retriable
	default:
		return "llama_stack", "server_error", true
	}
}

// mapLlamaStackClientErrorToFrontendError converts LlamaStackError to frontend-compatible error structure
func (app *App) mapLlamaStackClientErrorToFrontendError(lsErr *llamastack.LlamaStackError, statusCode int) *integrations.FrontendErrorResponse {
	// Enhance the error with categorization
	enhancedErr := llamastack.NewEnhancedLlamaStackError(lsErr)

	// Map category to frontend-expected component, code, and retriable
	component, code, retriable := categoryToFrontendError(enhancedErr.Category)

	// Override status code for transient errors to 503
	if retriable && (enhancedErr.Category == llamastack.CategoryModelTimeout || enhancedErr.Category == llamastack.CategoryModelOverloaded) {
		statusCode = http.StatusServiceUnavailable
	}

	return &integrations.FrontendErrorResponse{
		Status:  statusCode,
		Message: enhancedErr.UserFriendlyMsg,
		Error: &integrations.ErrorDetail{
			Component: component,
			Code:      code,
			Message:   enhancedErr.Message, // Original error message
			Retriable: retriable,
		},
	}
}
