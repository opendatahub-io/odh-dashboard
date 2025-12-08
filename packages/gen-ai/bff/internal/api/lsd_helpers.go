package api

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/openai/openai-go/v2"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack"
)

// handleLlamaStackError maps LlamaStack errors to appropriate HTTP status codes
// Handles both custom/wrapped errors thrown from our LlamaStack client and API errors (openai.Error)
func (app *App) handleLlamaStackError(w http.ResponseWriter, r *http.Request, err error, params llamastack.CreateResponseParams) {
	// First check for LlamaStackError (client errors from our LlamaStack integration)
	var lsErr *llamastack.LlamaStackError
	if errors.As(err, &lsErr) {
		statusCode := lsErr.StatusCode
		if statusCode == 0 {
			statusCode = app.getDefaultStatusCodeForLlamaStackClientError(lsErr.Code)
		}

		httpError := app.mapLlamaStackClientErrorToHTTPError(lsErr, statusCode)
		app.errorResponse(w, r, httpError)
		return
	}

	// Then check for openai.Error (API errors from LlamaStack service)
	var apiErr *openai.Error
	if errors.As(err, &apiErr) {
		statusCode := apiErr.StatusCode
		if statusCode == 0 {
			statusCode = app.getDefaultStatusCodeForLlamaStackAPIError(apiErr)
		}

		httpError := app.mapLlamaStackAPIErrorToHTTPError(apiErr, statusCode, params)
		app.errorResponse(w, r, httpError)
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
	case llamastack.ErrCodeModelNotFound:
		return http.StatusNotFound
	case llamastack.ErrCodeConnectionFailed, llamastack.ErrCodeTimeout, llamastack.ErrCodeServerUnavailable:
		return http.StatusServiceUnavailable
	case llamastack.ErrCodeInvalidResponse:
		return http.StatusBadGateway
	default:
		return http.StatusInternalServerError
	}
}

// getDefaultStatusCodeForLlamaStackAPIError returns default HTTP status codes for openai.Error
func (app *App) getDefaultStatusCodeForLlamaStackAPIError(apiErr *openai.Error) int {
	// LlamaStack API errors don't have structured error codes like MaaS,
	// so we rely on status codes from the API response
	// This function exists for consistency with the MaaS/MCP pattern
	return http.StatusInternalServerError
}

// mapLlamaStackClientErrorToHTTPError converts LlamaStackError to HTTP error with appropriate codes
func (app *App) mapLlamaStackClientErrorToHTTPError(lsErr *llamastack.LlamaStackError, statusCode int) *integrations.HTTPError {
	var code string
	var message string

	switch statusCode {
	case http.StatusBadRequest:
		code = "bad_request"
		message = lsErr.Message
	case http.StatusUnauthorized:
		code = "unauthorized"
		message = lsErr.Message
	case http.StatusNotFound:
		code = "not_found"
		message = lsErr.Message
	case http.StatusServiceUnavailable:
		code = "service_unavailable"
		message = lsErr.Message
	case http.StatusBadGateway:
		code = "bad_gateway"
		message = lsErr.Message
	case http.StatusInternalServerError:
		code = "internal_server_error"
		message = lsErr.Message
	default:
		code = "llamastack_error"
		message = fmt.Sprintf("LlamaStack client error (HTTP %d): %s", statusCode, lsErr.Message)
	}

	return &integrations.HTTPError{
		StatusCode: statusCode,
		ErrorResponse: integrations.ErrorResponse{
			Code:    code,
			Message: message,
		},
	}
}

// mapLlamaStackAPIErrorToHTTPError converts openai.Error to HTTP error with appropriate codes
func (app *App) mapLlamaStackAPIErrorToHTTPError(apiErr *openai.Error, statusCode int, params llamastack.CreateResponseParams) *integrations.HTTPError {
	var code string
	var message string

	switch statusCode {
	case http.StatusNotFound:
		code = "not_found"
		message = fmt.Sprintf("model '%s' not found or is not available", params.Model)
	case http.StatusUnauthorized:
		code = "unauthorized"
		message = apiErr.Message
	case http.StatusBadRequest:
		code = "bad_request"
		message = apiErr.Message
	case http.StatusInternalServerError:
		code = "internal_server_error"
		message = apiErr.Message
	default:
		code = "llamastack_error"
		message = fmt.Sprintf("LlamaStack server error (HTTP %d): %s", statusCode, apiErr.Message)
	}

	return &integrations.HTTPError{
		StatusCode: statusCode,
		ErrorResponse: integrations.ErrorResponse{
			Code:    code,
			Message: message,
		},
	}
}
