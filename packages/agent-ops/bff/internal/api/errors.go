package api

import (
	"fmt"
	"net/http"
)

const (
	ErrCodeBadRequest          = "BAD_REQUEST"
	ErrCodeForbidden           = "FORBIDDEN"
	ErrCodeUnauthorized        = "UNAUTHORIZED"
	ErrCodeNotFound            = "NOT_FOUND"
	ErrCodeMethodNotAllowed    = "METHOD_NOT_ALLOWED"
	ErrCodeInternalServerError = "INTERNAL_SERVER_ERROR"
	ErrCodeServiceUnavailable  = "SERVICE_UNAVAILABLE"
	ErrCodeConflict            = "CONFLICT"
	ErrCodeNotImplemented      = "NOT_IMPLEMENTED"
)

type HTTPError struct {
	StatusCode int          `json:"-"`
	Error      ErrorPayload `json:"error"`
}

type ErrorPayload struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func (app *App) LogError(r *http.Request, err error) {
	var (
		method = r.Method
		path   = r.URL.Path
	)

	app.logger.Error(err.Error(), "method", method, "path", path)
}

func (app *App) badRequestResponse(w http.ResponseWriter, r *http.Request, err error) {
	httpError := &HTTPError{StatusCode: http.StatusBadRequest, Error: ErrorPayload{Code: ErrCodeBadRequest, Message: err.Error()}}
	app.errorResponse(w, r, httpError)
}

func (app *App) forbiddenResponse(w http.ResponseWriter, r *http.Request, message string) {
	app.logger.Warn("Access forbidden", "message", message, "method", r.Method, "path", r.URL.Path)

	httpError := &HTTPError{StatusCode: http.StatusForbidden, Error: ErrorPayload{Code: ErrCodeForbidden, Message: "Access forbidden"}}
	app.errorResponse(w, r, httpError)
}

func (app *App) unauthorizedResponse(w http.ResponseWriter, r *http.Request, err error) {
	app.logger.Warn("Unauthorized request", "error", err.Error(), "method", r.Method, "path", r.URL.Path)

	httpError := &HTTPError{StatusCode: http.StatusUnauthorized, Error: ErrorPayload{Code: ErrCodeUnauthorized, Message: "Authentication required"}}
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

	httpError := &HTTPError{StatusCode: http.StatusInternalServerError, Error: ErrorPayload{Code: ErrCodeInternalServerError, Message: "the server encountered a problem and could not process your request"}}
	app.errorResponse(w, r, httpError)
}

func (app *App) serviceUnavailableResponse(w http.ResponseWriter, r *http.Request, err error) {
	app.LogError(r, err)

	httpError := &HTTPError{StatusCode: http.StatusServiceUnavailable, Error: ErrorPayload{Code: ErrCodeServiceUnavailable, Message: "the service is currently unavailable"}}
	app.errorResponse(w, r, httpError)
}

func (app *App) conflictResponse(w http.ResponseWriter, r *http.Request, err error) {
	app.LogError(r, err)

	httpError := &HTTPError{StatusCode: http.StatusConflict, Error: ErrorPayload{Code: ErrCodeConflict, Message: "the resource already exists"}}
	app.errorResponse(w, r, httpError)
}

func (app *App) notFoundResponse(w http.ResponseWriter, r *http.Request) {

	httpError := &HTTPError{StatusCode: http.StatusNotFound, Error: ErrorPayload{Code: ErrCodeNotFound, Message: "the requested resource could not be found"}}
	app.errorResponse(w, r, httpError)
}

func (app *App) methodNotAllowedResponse(w http.ResponseWriter, r *http.Request) {

	httpError := &HTTPError{StatusCode: http.StatusMethodNotAllowed, Error: ErrorPayload{Code: ErrCodeMethodNotAllowed, Message: fmt.Sprintf("the %s method is not supported for this resource", r.Method)}}
	app.errorResponse(w, r, httpError)
}
