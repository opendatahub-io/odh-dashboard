package api

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
)

// handleK8sClientError maps Kubernetes client errors to appropriate HTTP status codes
func (app *App) handleK8sClientError(w http.ResponseWriter, r *http.Request, err error) {
	if k8sErr, ok := err.(*kubernetes.K8sError); ok {
		statusCode := k8sErr.StatusCode
		if statusCode == 0 {
			statusCode = app.getDefaultStatusCodeForK8sError(k8sErr.Code)
		}

		httpError := app.mapK8sErrorToHTTPError(k8sErr, statusCode)
		app.errorResponse(w, r, httpError)
	} else {
		app.serverErrorResponse(w, r, err)
	}
}

// getDefaultStatusCodeForK8sError returns default HTTP status codes for K8s error codes
func (app *App) getDefaultStatusCodeForK8sError(errorCode string) int {
	switch errorCode {
	case kubernetes.ErrCodeUnauthorized:
		return http.StatusUnauthorized
	case kubernetes.ErrCodeForbidden, kubernetes.ErrCodePermissionDenied:
		return http.StatusForbidden
	case kubernetes.ErrCodeNotFound:
		return http.StatusNotFound
	default:
		return http.StatusInternalServerError
	}
}

// mapK8sErrorToHTTPError converts K8s error to HTTP error with appropriate codes
func (app *App) mapK8sErrorToHTTPError(k8sErr *kubernetes.K8sError, statusCode int) *integrations.HTTPError {
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

// handleSecretReadError maps K8s secret read errors to appropriate HTTP responses,
// preserving 403/404 from the API server instead of flattening them to 400.
func (app *App) handleSecretReadError(w http.ResponseWriter, r *http.Request, err error, secretName, secretKey string) {
	switch {
	case isSecretKeyMissing(err):
		app.badRequestResponse(w, r, fmt.Errorf("key %s not found in secret %q", secretKey, secretName))
	case apierrors.IsNotFound(err):
		app.notFoundResponse(w, r)
	case apierrors.IsForbidden(err):
		app.forbiddenResponse(w, r, fmt.Sprintf("access denied reading secret %q", secretName))
	case apierrors.IsUnauthorized(err):
		app.unauthorizedResponse(w, r, fmt.Errorf("unauthorized to read secret %q: %w", secretName, err))
	default:
		app.serverErrorResponse(w, r, fmt.Errorf("failed to read %s from secret %q: %w", secretKey, secretName, err))
	}
}

// isSecretKeyMissing returns true when the error indicates a specific key was
// not found inside an existing Secret (as opposed to a K8s API error).
func isSecretKeyMissing(err error) bool {
	return errors.Is(err, kubernetes.ErrSecretKeyNotFound)
}
