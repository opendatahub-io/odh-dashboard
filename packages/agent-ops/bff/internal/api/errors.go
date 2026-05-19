package api

import (
	"fmt"
	"net/http"
	"strconv"
)

// HTTPError pairs an HTTP status code with a structured error payload for JSON responses.
type HTTPError struct {
	StatusCode int          `json:"-"`
	Error      ErrorPayload `json:"error"`
}

// ErrorPayload is the JSON body returned for API errors.
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

func (app *App) unauthorizedResponse(w http.ResponseWriter, r *http.Request, err error) {
	app.logger.Warn("Unauthorized access attempt", "error", err.Error(), "method", r.Method, "uri", r.URL.RequestURI())
	httpError := &HTTPError{
		StatusCode: http.StatusUnauthorized,
		Error:      ErrorPayload{Code: strconv.Itoa(http.StatusUnauthorized), Message: "Access unauthorized"},
	}
	app.errorResponse(w, r, httpError)
}

func (app *App) badRequestResponse(w http.ResponseWriter, r *http.Request, err error) {
	httpError := &HTTPError{
		StatusCode: http.StatusBadRequest,
		Error:      ErrorPayload{Code: strconv.Itoa(http.StatusBadRequest), Message: err.Error()},
	}
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

	httpError := &HTTPError{
		StatusCode: http.StatusInternalServerError,
		Error:      ErrorPayload{Code: strconv.Itoa(http.StatusInternalServerError), Message: "the server encountered a problem and could not process your request"},
	}
	app.errorResponse(w, r, httpError)
}

func (app *App) notFoundResponse(w http.ResponseWriter, r *http.Request) {
	httpError := &HTTPError{
		StatusCode: http.StatusNotFound,
		Error:      ErrorPayload{Code: strconv.Itoa(http.StatusNotFound), Message: "the requested resource could not be found"},
	}
	app.errorResponse(w, r, httpError)
}

func (app *App) methodNotAllowedResponse(w http.ResponseWriter, r *http.Request) {
	httpError := &HTTPError{
		StatusCode: http.StatusMethodNotAllowed,
		Error:      ErrorPayload{Code: strconv.Itoa(http.StatusMethodNotAllowed), Message: fmt.Sprintf("the %s method is not supported for this resource", r.Method)},
	}
	app.errorResponse(w, r, httpError)
}
