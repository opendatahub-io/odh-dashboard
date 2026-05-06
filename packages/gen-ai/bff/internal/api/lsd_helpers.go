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
		if writeErr := app.WriteJSON(w, frontendErr.StatusCode, frontendErr, nil); writeErr != nil {
			app.LogError(r, writeErr)
			w.WriteHeader(frontendErr.StatusCode)
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

func (app *App) mapLlamaStackClientErrorToFrontendError(lsErr *llamastack.LlamaStackError, statusCode int) *integrations.FrontendErrorResponse {
	errorCode := lsErr.ErrorCode
	if errorCode == "" {
		errorCode = lsErr.Code
	}

	// Determine component from error code
	var component string
	switch errorCode {
	case "tool_not_found", "tool_error", "mcp_error":
		component = "mcp"
	case "resource_not_found", "vector_store_not_found":
		component = "rag"
	case "content_policy_violation", "content_blocked", "guardrail_violation":
		component = "guardrails"
	case "invalid_model", "model_not_found", "model_unavailable", "model_error", "invalid_parameter", "invalid_request_error":
		component = "model"
	case "INVALID_REQUEST", "UNAUTHORIZED", "NOT_FOUND", "CONNECTION_FAILED", "SERVER_UNAVAILABLE", "INTERNAL_ERROR", "TIMEOUT":
		component = "bff"
	default:
		component = "llama_stack"
	}

	// Determine if error is retriable
	// An error is retriable when:
	// - The error code is a known transient code (timeout, server_error, rate_limit, etc.), OR
	// - The HTTP status is 429, 500, 502, 503, or 504
	var retriable bool
	switch errorCode {
	case "rate_limit_exceeded", "insufficient_quota", "requests_per_minute_exceeded":
		retriable = true
	case "timeout", "request_timeout", "gateway_timeout":
		retriable = true
	case "server_error", "internal_error", "service_unavailable":
		retriable = true
	case "tool_not_found", "tool_error", "mcp_error":
		retriable = true
	default:
		// HTTP 429 (Too Many Requests) and 5xx errors are retriable
		retriable = statusCode == http.StatusTooManyRequests || statusCode >= 500
	}

	toolName := ""
	if component == "mcp" && lsErr.Param != "" {
		toolName = lsErr.Param
	}

	return &integrations.FrontendErrorResponse{
		StatusCode: statusCode,
		Error: &integrations.ErrorDetail{
			Component: component,
			Code:      errorCode,
			Message:   lsErr.Message,
			ToolName:  toolName,
			Retriable: retriable,
		},
	}
}
