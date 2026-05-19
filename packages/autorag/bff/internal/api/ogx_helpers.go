package api

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/opendatahub-io/autorag-library/bff/internal/integrations"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/ogx"
)

// handleOGXClientError maps Open GenAI Stack client errors to appropriate HTTP status codes and sends the response.
// Uses errors.As to unwrap the error chain, since repository errors are wrapped with fmt.Errorf("...: %w", err).
func (app *App) handleOGXClientError(w http.ResponseWriter, r *http.Request, err error) {
	var ogxErr *ogx.OGXError
	if errors.As(err, &ogxErr) {
		statusCode := ogxErr.StatusCode
		if statusCode == 0 {
			statusCode = app.getDefaultStatusCodeForOGXClientError(ogxErr.Code)
		}

		if statusCode >= 500 {
			app.LogError(r, err)
		}

		httpError := app.mapOGXClientErrorToHTTPError(ogxErr, statusCode)
		app.errorResponse(w, r, httpError)
		return
	}

	// Fall back to generic error for unknown error types
	app.serverErrorResponse(w, r, err)
}

// getDefaultStatusCodeForOGXClientError returns default HTTP status codes for OGXError codes
func (app *App) getDefaultStatusCodeForOGXClientError(errorCode string) int {
	switch errorCode {
	case ogx.ErrCodeInvalidRequest:
		return http.StatusBadRequest
	case ogx.ErrCodeUnauthorized:
		return http.StatusUnauthorized
	case ogx.ErrCodeNotFound:
		return http.StatusNotFound
	case ogx.ErrCodeConnectionFailed:
		return http.StatusBadGateway
	case ogx.ErrCodeTimeout, ogx.ErrCodeServerUnavailable:
		return http.StatusServiceUnavailable
	default:
		return http.StatusInternalServerError
	}
}

// mapOGXClientErrorToHTTPError converts OGXError to HTTP error with appropriate codes
func (app *App) mapOGXClientErrorToHTTPError(lsErr *ogx.OGXError, statusCode int) *integrations.HTTPError {
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
			code = "ogx_error"
			message = fmt.Sprintf("Open GenAI Stack client error (HTTP %d): %s", statusCode, lsErr.Message)
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
