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

func getComponentFromErrorCode(errorCode string) string {
	switch errorCode {
	case "tool_not_found", "tool_error", "mcp_error":
		return "mcp"
	case "resource_not_found", "vector_store_not_found":
		return "rag"
	case "content_policy_violation", "content_blocked", "guardrail_violation":
		return "guardrails"
	case "invalid_model", "model_not_found", "model_unavailable", "model_error":
		return "model"
	default:
		return "llama_stack"
	}
}

func isRetriableError(errorCode string, statusCode int) bool {
	switch errorCode {
	case "rate_limit_exceeded", "insufficient_quota", "requests_per_minute_exceeded":
		return true
	case "timeout", "request_timeout", "gateway_timeout":
		return true
	case "server_error", "internal_error", "service_unavailable":
		return true
	default:
		return statusCode >= 500
	}
}

func (app *App) mapLlamaStackClientErrorToFrontendError(lsErr *llamastack.LlamaStackError, statusCode int) *integrations.FrontendErrorResponse {
	errorCode := lsErr.ErrorCode
	if errorCode == "" {
		errorCode = lsErr.Code
	}

	component := getComponentFromErrorCode(errorCode)
	retriable := isRetriableError(errorCode, statusCode)

	if retriable && (statusCode == 429 || statusCode == 504) {
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
			Code:      errorCode,
			Message:   lsErr.Message,
			ToolName:  toolName,
			Retriable: retriable,
		},
	}
}
