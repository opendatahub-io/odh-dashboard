package api

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/opendatahub-io/autorag-library/bff/internal/integrations"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/llamastack"
)

// handleLlamaStackClientError maps LlamaStack client errors to appropriate HTTP status codes and sends the response.
// Uses errors.As to unwrap the error chain, since repository errors are wrapped with fmt.Errorf("...: %w", err).
func (app *App) handleLlamaStackClientError(w http.ResponseWriter, r *http.Request, err error) {
	var llamastackErr *llamastack.LlamaStackError
	if errors.As(err, &llamastackErr) {
		statusCode := llamastackErr.StatusCode
		if statusCode == 0 {
			statusCode = app.getDefaultStatusCodeForLlamaStackClientError(llamastackErr.Code)
		}

		if statusCode >= 500 {
			app.LogError(r, err)
		}

		httpError := app.mapLlamaStackClientErrorToHTTPError(llamastackErr, statusCode)
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
		message = "The server encountered a problem and could not process your request"
	case http.StatusBadGateway:
		code = "bad_gateway"
		message = "The server encountered a problem and could not process your request"
	case http.StatusInternalServerError:
		code = "internal_server_error"
		message = "The server encountered a problem and could not process your request"
	default:
		if statusCode >= 500 {
			code = "server_error"
			message = "The server encountered a problem and could not process your request"
		} else {
			code = "llamastack_error"
			message = fmt.Sprintf("LlamaStack client error (HTTP %d): %s", statusCode, lsErr.Message)
		}
	}

	return &integrations.HTTPError{
		StatusCode: statusCode,
		ErrorResponse: integrations.ErrorResponse{
			Code:    code,
			Message: message,
		},
	}
}
