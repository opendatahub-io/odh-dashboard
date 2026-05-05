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

		frontendErr, responseStatus := app.mapLlamaStackClientErrorToFrontendError(llamastackErr, statusCode)

		// Send frontend-compatible error response
		if writeErr := app.WriteJSON(w, responseStatus, frontendErr, nil); writeErr != nil {
			app.LogError(r, writeErr)
			w.WriteHeader(responseStatus)
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
	case "invalid_model", "model_not_found", "model_unavailable", "model_error", "invalid_parameter", "invalid_request_error":
		return "model"
	case "INVALID_REQUEST", "UNAUTHORIZED", "NOT_FOUND", "CONNECTION_FAILED", "SERVER_UNAVAILABLE", "INTERNAL_ERROR", "TIMEOUT":
		return "bff"
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
	case "tool_not_found", "tool_error", "mcp_error":
		return true
	default:
		return statusCode >= 500
	}
}

func shouldOverrideToServiceUnavailable(errorCode string) bool {
	switch errorCode {
	case "rate_limit_exceeded", "insufficient_quota", "requests_per_minute_exceeded":
		return true
	case "timeout", "request_timeout", "gateway_timeout":
		return true
	default:
		return false
	}
}

func (app *App) mapLlamaStackClientErrorToFrontendError(lsErr *llamastack.LlamaStackError, statusCode int) (*integrations.FrontendErrorResponse, int) {
	errorCode := lsErr.ErrorCode
	if errorCode == "" {
		errorCode = lsErr.Code
	}

	component := getComponentFromErrorCode(errorCode)
	retriable := isRetriableError(errorCode, statusCode)

	if shouldOverrideToServiceUnavailable(errorCode) && (statusCode == 429 || statusCode == 500 || statusCode == 504) {
		statusCode = http.StatusServiceUnavailable
	}

	toolName := ""
	if component == "mcp" && lsErr.Param != "" {
		toolName = lsErr.Param
	}

	return &integrations.FrontendErrorResponse{
		Error: &integrations.ErrorDetail{
			Component: component,
			Code:      errorCode,
			Message:   lsErr.Message,
			ToolName:  toolName,
			Retriable: retriable,
		},
	}, statusCode
}
