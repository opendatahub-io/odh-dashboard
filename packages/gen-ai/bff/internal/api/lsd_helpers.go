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

func categoryToFrontendError(category llamastack.ResponseErrorCategory) (component, code string, retriable bool) {
	switch category {
	case llamastack.CategoryModelTimeout:
		return "llama_stack", "timeout", true
	case llamastack.CategoryModelOverloaded:
		return "llama_stack", "rate_limit", true
	case llamastack.CategoryRAGError:
		return "rag", "unreachable", true
	case llamastack.CategoryRAGVectorStoreNotFound:
		return "rag", "not_found", false
	case llamastack.CategoryGuardrailsError:
		return "guardrails", "unreachable", true
	case llamastack.CategoryGuardrailsViolation:
		return "guardrails", "content_blocked", false
	case llamastack.CategoryMCPError:
		return "mcp", "unreachable", true
	case llamastack.CategoryMCPToolNotFound:
		return "mcp", "not_found", false
	case llamastack.CategoryMCPAuthError:
		return "mcp", "unauthorized", false
	case llamastack.CategoryInvalidModelConfig:
		return "model", "invalid_model_config", false
	case llamastack.CategoryUnsupportedFeature:
		return "model", "unsupported_feature", false
	case llamastack.CategoryInvalidParameter:
		return "model", "invalid_parameter", false
	case llamastack.CategoryModelInvocationError:
		return "llama_stack", "server_error", true
	default:
		return "llama_stack", "server_error", true
	}
}

func (app *App) mapLlamaStackClientErrorToFrontendError(lsErr *llamastack.LlamaStackError, statusCode int) *integrations.FrontendErrorResponse {
	enhancedErr := llamastack.NewEnhancedLlamaStackError(lsErr)
	component, code, retriable := categoryToFrontendError(enhancedErr.Category)

	if retriable && (enhancedErr.Category == llamastack.CategoryModelTimeout || enhancedErr.Category == llamastack.CategoryModelOverloaded) {
		statusCode = http.StatusServiceUnavailable
	}

	toolName := ""
	if component == "mcp" && lsErr.Param != "" {
		toolName = lsErr.Param
	}

	return &integrations.FrontendErrorResponse{
		Status: statusCode,
		Error: &integrations.ErrorDetail{
			Component: component,
			Code:      code,
			Message:   enhancedErr.Message,
			ToolName:  toolName,
			Retriable: retriable,
		},
	}
}
