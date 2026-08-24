package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
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
	// Log the path only, never the full RequestURI: query strings on these routes can carry
	// tokens or other sensitive values that must not end up in logs.
	var (
		method = r.Method
		path   = r.URL.Path
	)

	app.logger.Error(err.Error(), "method", method, "path", path)
}

func (app *App) badRequestResponse(w http.ResponseWriter, r *http.Request, err error) {
	httpError := &HTTPError{StatusCode: http.StatusBadRequest, Error: ErrorPayload{Code: strconv.Itoa(http.StatusBadRequest), Message: err.Error()}}
	app.errorResponse(w, r, httpError)
}

func (app *App) unauthorizedResponse(w http.ResponseWriter, r *http.Request, err error) {
	// Log the path only, never the full RequestURI: query strings on these routes can carry
	// tokens or other sensitive values that must not end up in logs.
	app.logger.Warn("Unauthorized request", "error", err, "method", r.Method, "path", r.URL.Path)

	httpError := &HTTPError{StatusCode: http.StatusUnauthorized, Error: ErrorPayload{Code: strconv.Itoa(http.StatusUnauthorized), Message: "authentication required"}}
	app.errorResponse(w, r, httpError)
}

func (app *App) serviceUnavailableResponse(w http.ResponseWriter, r *http.Request, err error) {
	app.LogError(r, err)

	httpError := &HTTPError{StatusCode: http.StatusServiceUnavailable, Error: ErrorPayload{Code: strconv.Itoa(http.StatusServiceUnavailable), Message: "the upstream service is unavailable"}}
	app.errorResponse(w, r, httpError)
}

func (app *App) forbiddenResponse(w http.ResponseWriter, r *http.Request, message string) {
	// Log the detailed error message as a warning. Path only, never the full RequestURI — see
	// LogError above.
	app.logger.Warn("Access forbidden", "message", message, "method", r.Method, "path", r.URL.Path)

	httpError := &HTTPError{StatusCode: http.StatusForbidden, Error: ErrorPayload{Code: strconv.Itoa(http.StatusForbidden), Message: "Access forbidden"}}
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

	httpError := &HTTPError{StatusCode: http.StatusInternalServerError, Error: ErrorPayload{Code: strconv.Itoa(http.StatusInternalServerError), Message: "the server encountered a problem and could not process your request"}}
	app.errorResponse(w, r, httpError)
}

func (app *App) notFoundResponse(w http.ResponseWriter, r *http.Request) {

	httpError := &HTTPError{StatusCode: http.StatusNotFound, Error: ErrorPayload{Code: strconv.Itoa(http.StatusNotFound), Message: "the requested resource could not be found"}}
	app.errorResponse(w, r, httpError)
}

func (app *App) methodNotAllowedResponse(w http.ResponseWriter, r *http.Request) {

	httpError := &HTTPError{StatusCode: http.StatusMethodNotAllowed, Error: ErrorPayload{Code: strconv.Itoa(http.StatusMethodNotAllowed), Message: fmt.Sprintf("the %s method is not supported for this resource", r.Method)}}
	app.errorResponse(w, r, httpError)
}

func (app *App) failedValidationResponse(w http.ResponseWriter, r *http.Request, errors map[string]string) { //nolint:unused

	message, err := json.Marshal(errors)
	if err != nil {
		message = []byte("{}")
	}
	httpError := &HTTPError{StatusCode: http.StatusUnprocessableEntity, Error: ErrorPayload{Code: strconv.Itoa(http.StatusUnprocessableEntity), Message: string(message)}}
	app.errorResponse(w, r, httpError)
}
