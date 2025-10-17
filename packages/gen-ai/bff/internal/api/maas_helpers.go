package api

import (
	"fmt"
	"net/http"

	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/maas"
)

// handleMaaSClientError maps MaaS client errors to appropriate HTTP status codes
func (app *App) handleMaaSClientError(w http.ResponseWriter, r *http.Request, err error) {
	if maasErr, ok := err.(*maas.MaaSError); ok {
		statusCode := maasErr.StatusCode
		if statusCode == 0 {
			statusCode = app.getDefaultStatusCodeForMaaSError(maasErr.Code)
		}

		httpError := app.mapMaaSErrorToHTTPError(maasErr, statusCode)
		app.errorResponse(w, r, httpError)
	} else {
		app.serverErrorResponse(w, r, err)
	}
}

// getDefaultStatusCodeForMaaSError returns default HTTP status codes for MaaS error codes
func (app *App) getDefaultStatusCodeForMaaSError(errorCode string) int {
	switch errorCode {
	case maas.ErrCodeUnauthorized:
		return http.StatusUnauthorized
	case maas.ErrCodeConnectionFailed, maas.ErrCodeTimeout:
		return http.StatusServiceUnavailable
	case maas.ErrCodeServerUnavailable:
		return http.StatusServiceUnavailable
	case maas.ErrCodeInvalidResponse:
		return http.StatusBadGateway
	default:
		return http.StatusInternalServerError
	}
}

// mapMaaSErrorToHTTPError converts MaaS error to HTTP error with appropriate codes
func (app *App) mapMaaSErrorToHTTPError(maasErr *maas.MaaSError, statusCode int) *integrations.HTTPError {
	var code string
	var message string

	switch statusCode {
	case http.StatusUnauthorized:
		code = "unauthorized"
		message = maasErr.Message
	case http.StatusForbidden:
		code = "forbidden"
		message = maasErr.Message
	case http.StatusServiceUnavailable:
		code = "service_unavailable"
		message = maasErr.Message
	case http.StatusBadGateway:
		code = "bad_gateway"
		message = fmt.Sprintf("Invalid response from MaaS server: %s", maasErr.Message)
	case http.StatusInternalServerError:
		code = "internal_server_error"
		message = maasErr.Message
	default:
		code = "maas_error"
		message = fmt.Sprintf("MaaS server error (HTTP %d): %s", statusCode, maasErr.Message)
		statusCode = http.StatusBadGateway
	}

	return &integrations.HTTPError{
		StatusCode: statusCode,
		ErrorResponse: integrations.ErrorResponse{
			Code:    code,
			Message: message,
		},
	}
}
