package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"

	"github.com/openai/openai-go/v2"
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

// isRetriable determines whether an error is transient and worth retrying.
// Matches known OGX response.failed codes first (see OGXErr* constants in
// llamastack/errors.go), then falls back to HTTP status code heuristics for
// codes from other paths (type:"error" events, non-streaming HTTP errors).
func (app *App) isRetriable(errorCode string, statusCode int) bool {
	switch errorCode {
	// OGX response.failed codes that are transient
	case llamastack.OGXErrServerError, llamastack.OGXErrRateLimitExceeded,
		llamastack.OGXErrVectorStoreTimeout:
		return true
	default:
		// HTTP 429 (Too Many Requests) and 5xx errors are retriable
		return statusCode == http.StatusTooManyRequests || statusCode >= 500
	}
}

// buildStreamingErrorEvent constructs the SSE error JSON payload that the frontend
// expects on every streaming error: {error: {message, code, component, retriable}}.
func buildStreamingErrorEvent(code, message, component string, retriable bool) []byte {
	errorData := map[string]interface{}{
		"error": map[string]interface{}{
			"message":   message,
			"code":      code,
			"component": component,
			"retriable": retriable,
		},
	}
	data, _ := json.Marshal(errorData)
	return data
}

// extractStreamingError parses a stream.Err() error into the four fields the
// frontend needs. Supports wrapped LlamaStackError via errors.As(), raw network
// errors (*url.Error), and OpenAI API errors; falls back to generic values for
// unknown error types.
func (app *App) extractStreamingError(err error) (message, code, component string, retriable bool) {
	var lsErr *llamastack.LlamaStackError
	if errors.As(err, &lsErr) {
		message = lsErr.Message
		code = lsErr.ErrorCode
		if code == "" {
			code = lsErr.Code
		}
		component = lsErr.Component

		statusCode := lsErr.StatusCode
		if statusCode == 0 {
			statusCode = app.getDefaultStatusCodeForLlamaStackClientError(lsErr.Code)
		}
		retriable = app.isRetriable(code, statusCode)
		return
	}

	var urlErr *url.Error
	if errors.As(err, &urlErr) {
		return fmt.Sprintf("Failed to connect to LlamaStack server: %s", urlErr.Err.Error()),
			llamastack.ErrCodeConnectionFailed, llamastack.ComponentOGX, true
	}

	var apiErr *openai.Error
	if errors.As(err, &apiErr) {
		errorCode := apiErr.Code
		if errorCode == "" {
			errorCode = llamastack.ErrCodeInternalError
		}
		component = llamastack.ResolveComponent(errorCode)
		apiMessage := apiErr.Message
		if apiMessage == "" {
			apiMessage = apiErr.Error()
		}
		return apiMessage, errorCode, component, app.isRetriable(errorCode, apiErr.StatusCode)
	}

	return "An error occurred during streaming. Please try again.", "streaming_error", llamastack.ComponentBFF, false
}

func (app *App) mapLlamaStackClientErrorToFrontendError(lsErr *llamastack.LlamaStackError, statusCode int) *integrations.FrontendErrorResponse {
	errorCode := lsErr.ErrorCode
	if errorCode == "" {
		errorCode = lsErr.Code
	}

	retriable := app.isRetriable(errorCode, statusCode)

	return &integrations.FrontendErrorResponse{
		StatusCode: statusCode,
		Error: &integrations.ErrorDetail{
			Component: lsErr.Component,
			Code:      errorCode,
			Message:   lsErr.Message,
			Retriable: retriable,
		},
	}
}
