package api

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/opendatahub-io/autorag-library/bff/internal/integrations"
	k8s "github.com/opendatahub-io/autorag-library/bff/internal/integrations/kubernetes"
)

// Maps K8sError types to appropriate HTTP responses with proper status codes.
func (app *App) handleK8sClientError(w http.ResponseWriter, r *http.Request, err error) {
	var k8sErr *k8s.K8sError
	if errors.As(err, &k8sErr) {
		statusCode := k8sErr.StatusCode
		if statusCode == 0 {
			statusCode = app.getDefaultStatusCodeForK8sError(k8sErr.Code)
		}

		httpError := app.mapK8sErrorToHTTPError(k8sErr, statusCode)
		app.errorResponse(w, r, httpError)
		return
	}

	// For non-K8sError, return generic server error
	app.serverErrorResponse(w, r, err)
}

// getDefaultStatusCodeForK8sError returns default HTTP status codes for K8s error codes
func (app *App) getDefaultStatusCodeForK8sError(errorCode string) int {
	switch errorCode {
	case k8s.ErrCodeUnauthorized:
		return http.StatusUnauthorized
	case k8s.ErrCodeForbidden, k8s.ErrCodePermissionDenied:
		return http.StatusForbidden
	case k8s.ErrCodeNotFound:
		return http.StatusNotFound
	default:
		return http.StatusInternalServerError
	}
}

// mapK8sErrorToHTTPError converts K8s error to HTTP error with appropriate codes
func (app *App) mapK8sErrorToHTTPError(k8sErr *k8s.K8sError, statusCode int) *integrations.HTTPError {
	var code string
	var message string

	switch statusCode {
	case http.StatusUnauthorized:
		code = "unauthorized"
		message = k8sErr.Message
	case http.StatusForbidden:
		code = "forbidden"
		message = k8sErr.Message
	case http.StatusNotFound:
		code = "not_found"
		message = k8sErr.Message
	case http.StatusInternalServerError:
		code = "internal_server_error"
		message = k8sErr.Message
	default:
		code = "k8s_error"
		message = fmt.Sprintf("Kubernetes error (HTTP %d): %s", statusCode, k8sErr.Message)
	}

	return &integrations.HTTPError{
		StatusCode: statusCode,
		ErrorResponse: integrations.ErrorResponse{
			Code:    code,
			Message: message,
		},
	}
}
