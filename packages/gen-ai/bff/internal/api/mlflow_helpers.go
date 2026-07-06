package api

import (
	"errors"
	"fmt"
	"net/http"
	"net/url"

	"github.com/opendatahub-io/gen-ai/internal/integrations"
	sdkmlflow "github.com/opendatahub-io/mlflow-go/mlflow"
)

// handleMLflowClientError maps MLflow client errors to appropriate HTTP responses.
// Uses the mlflow-go SDK's typed APIError and helper functions for classification.
func (app *App) handleMLflowClientError(w http.ResponseWriter, r *http.Request, err error) {
	var apiErr *sdkmlflow.APIError
	if errors.As(err, &apiErr) {
		httpError := app.mapMLflowAPIErrorToHTTPError(apiErr)
		app.errorResponse(w, r, httpError)
		return
	}

	// Network-level errors (connection refused, DNS failure, timeout)
	var urlErr *url.Error
	if errors.As(err, &urlErr) {
		httpError := &integrations.HTTPError{
			StatusCode: http.StatusServiceUnavailable,
			ErrorResponse: integrations.ErrorResponse{
				Code:    "service_unavailable",
				Message: fmt.Sprintf("MLflow server is not reachable: %s", urlErr.Err),
			},
		}
		app.errorResponse(w, r, httpError)
		return
	}

	app.serverErrorResponse(w, r, err)
}

// mapMLflowAPIErrorToHTTPError converts an MLflow SDK APIError to an HTTP error
// with appropriate status code and message.
func (app *App) mapMLflowAPIErrorToHTTPError(apiErr *sdkmlflow.APIError) *integrations.HTTPError {
	statusCode := apiErr.StatusCode
	if statusCode == 0 {
		statusCode = http.StatusInternalServerError
	}

	var code string
	var message string

	switch {
	case statusCode == http.StatusUnauthorized:
		code = "unauthorized"
		message = apiErr.Message
	case statusCode == http.StatusForbidden:
		code = "forbidden"
		message = apiErr.Message
	case statusCode == http.StatusNotFound:
		code = "not_found"
		message = apiErr.Message
	case statusCode == http.StatusBadRequest:
		code = "bad_request"
		message = apiErr.Message
	case statusCode == http.StatusConflict:
		code = "conflict"
		message = apiErr.Message
	case statusCode >= 500:
		code = "service_unavailable"
		message = fmt.Sprintf("MLflow server error: %s", apiErr.Message)
	default:
		code = "mlflow_error"
		message = fmt.Sprintf("MLflow error (HTTP %d): %s", statusCode, apiErr.Message)
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
