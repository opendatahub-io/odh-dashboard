package api

import (
	"errors"
	"fmt"
	"net/http"

	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// HTTPError represents an HTTP error response with status code and error details.
type HTTPError struct {
	StatusCode int          `json:"-"`
	Error      ErrorPayload `json:"error"`
}

// ErrorPayload holds error code and message details.
type ErrorPayload struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func (app *App) LogError(r *http.Request, err error) {
	var (
		method = r.Method
		uri    = r.URL.RequestURI()
	)

	app.logger.Error(err.Error(), "method", method, "uri", uri)
}

func (app *App) badRequestResponse(w http.ResponseWriter, r *http.Request, err error) {
	httpError := &HTTPError{StatusCode: http.StatusBadRequest, Error: ErrorPayload{Code: "BAD_REQUEST", Message: err.Error()}}
	app.errorResponse(w, r, httpError)
}

func (app *App) unauthorizedResponse(w http.ResponseWriter, r *http.Request, err error) {
	app.logger.Warn("Unauthorized access attempt", "error", err.Error(), "method", r.Method, "uri", r.URL.RequestURI())
	httpError := &HTTPError{StatusCode: http.StatusUnauthorized, Error: ErrorPayload{Code: "UNAUTHORIZED", Message: "Access unauthorized"}}
	app.errorResponse(w, r, httpError)
}

func (app *App) errorResponse(w http.ResponseWriter, r *http.Request, httpErr *HTTPError) {
	err := app.WriteJSON(w, httpErr.StatusCode, httpErr, nil)
	if err != nil {
		app.LogError(r, err)
		w.WriteHeader(httpErr.StatusCode)
	}
}

func (app *App) serverErrorResponse(w http.ResponseWriter, r *http.Request, err error) {
	app.LogError(r, err)

	httpError := &HTTPError{StatusCode: http.StatusInternalServerError, Error: ErrorPayload{Code: "INTERNAL_SERVER_ERROR", Message: "the server encountered a problem and could not process your request"}}
	app.errorResponse(w, r, httpError)
}

func (app *App) forbiddenResponse(w http.ResponseWriter, r *http.Request, err error) {
	app.logger.Warn("Forbidden access attempt", "error", err.Error(), "method", r.Method, "uri", r.URL.RequestURI())
	httpError := &HTTPError{StatusCode: http.StatusForbidden, Error: ErrorPayload{Code: "FORBIDDEN", Message: err.Error()}}
	app.errorResponse(w, r, httpError)
}

func (app *App) notFoundResponse(w http.ResponseWriter, r *http.Request) {

	httpError := &HTTPError{StatusCode: http.StatusNotFound, Error: ErrorPayload{Code: "NOT_FOUND", Message: "the requested resource could not be found"}}
	app.errorResponse(w, r, httpError)
}

func (app *App) methodNotAllowedResponse(w http.ResponseWriter, r *http.Request) {

	httpError := &HTTPError{StatusCode: http.StatusMethodNotAllowed, Error: ErrorPayload{Code: "METHOD_NOT_ALLOWED", Message: fmt.Sprintf("the %s method is not supported for this resource", r.Method)}}
	app.errorResponse(w, r, httpError)
}

// k8sErrorResponse extracts the status code from a K8s StatusError and returns
// the appropriate HTTP response. Falls back to 500 for non-K8s errors.
// The client-facing message is derived from the Reason, not the raw Status.Message,
// to avoid leaking resource names, RBAC details, or service account identifiers.
func (app *App) k8sErrorResponse(w http.ResponseWriter, r *http.Request, err error) {
	var statusErr *k8serrors.StatusError
	if errors.As(err, &statusErr) {
		code := int(statusErr.Status().Code)
		if code == 0 {
			code = http.StatusInternalServerError
		}
		reason := statusErr.Status().Reason
		httpError := &HTTPError{StatusCode: code, Error: ErrorPayload{Code: string(reason), Message: sanitizeK8sReason(reason)}}
		app.LogError(r, err)
		app.errorResponse(w, r, httpError)
		return
	}
	app.serverErrorResponse(w, r, err)
}

func sanitizeK8sReason(reason metav1.StatusReason) string {
	switch reason {
	case metav1.StatusReasonNotFound:
		return "the requested resource could not be found"
	case metav1.StatusReasonAlreadyExists:
		return "the resource already exists"
	case metav1.StatusReasonConflict:
		return "the resource was modified by another request"
	case metav1.StatusReasonForbidden:
		return "insufficient permissions for this operation"
	case metav1.StatusReasonUnauthorized:
		return "authentication required"
	case metav1.StatusReasonBadRequest:
		return "invalid request"
	case metav1.StatusReasonGone:
		return "the requested resource is no longer available"
	case metav1.StatusReasonExpired:
		return "the request has expired"
	case metav1.StatusReasonServiceUnavailable:
		return "the service is temporarily unavailable"
	default:
		return "the server encountered an error processing your request"
	}
}
