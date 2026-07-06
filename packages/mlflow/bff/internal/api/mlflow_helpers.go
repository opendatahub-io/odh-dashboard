package api

import (
	"errors"
	"fmt"
	"net/http"
	"net/url"

	sdkmlflow "github.com/opendatahub-io/mlflow-go/mlflow"
	mlflowpkg "github.com/opendatahub-io/mlflow/bff/internal/integrations/mlflow"
)

// handleMLflowClientError maps MLflow client errors to appropriate HTTP responses.
func (app *App) handleMLflowClientError(w http.ResponseWriter, r *http.Request, err error) {
	if errors.Is(err, mlflowpkg.ErrMLflowNotConfigured) {
		httpError := &HTTPError{
			StatusCode: http.StatusServiceUnavailable,
			Error: ErrorPayload{
				Code:    "service_unavailable",
				Message: "MLflow is not configured on this deployment",
			},
		}
		app.errorResponse(w, r, httpError)
		return
	}

	var apiErr *sdkmlflow.APIError
	if errors.As(err, &apiErr) {
		httpError := app.mapMLflowAPIErrorToHTTPError(apiErr)
		app.errorResponse(w, r, httpError)
		return
	}

	var urlErr *url.Error
	if errors.As(err, &urlErr) {
		app.LogError(r, urlErr)
		httpError := &HTTPError{
			StatusCode: http.StatusServiceUnavailable,
			Error: ErrorPayload{
				Code:    "service_unavailable",
				Message: "MLflow server is not reachable",
			},
		}
		app.errorResponse(w, r, httpError)
		return
	}

	app.serverErrorResponse(w, r, err)
}

var knownHTTPStatusCodes = map[int]string{
	http.StatusBadRequest:   "bad_request",
	http.StatusUnauthorized: "unauthorized",
	http.StatusForbidden:    "forbidden",
	http.StatusNotFound:     "not_found",
	http.StatusConflict:     "conflict",
}

// mapMLflowAPIErrorToHTTPError converts an MLflow SDK APIError to an HTTP error
// with appropriate status code and message.
func (app *App) mapMLflowAPIErrorToHTTPError(apiErr *sdkmlflow.APIError) *HTTPError {
	statusCode := apiErr.StatusCode
	if statusCode == 0 {
		statusCode = http.StatusInternalServerError
	}

	var code, message string

	if c, ok := knownHTTPStatusCodes[statusCode]; ok {
		code = c
		message = apiErr.Message
	} else if statusCode >= 500 {
		code = "service_unavailable"
		app.logger.Error("MLflow upstream error", "statusCode", statusCode, "error", apiErr.Message)
		message = "MLflow server error"
	} else {
		code = "mlflow_error"
		app.logger.Error("MLflow unexpected status", "statusCode", statusCode, "error", apiErr.Message)
		message = fmt.Sprintf("MLflow request failed (HTTP %d)", statusCode)
		statusCode = http.StatusBadGateway
	}

	return &HTTPError{
		StatusCode: statusCode,
		Error: ErrorPayload{
			Code:    code,
			Message: message,
		},
	}
}
