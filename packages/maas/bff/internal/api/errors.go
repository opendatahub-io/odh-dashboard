package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"

	"github.com/opendatahub-io/maas-library/bff/internal/integrations/maas"
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
		uri    = r.URL.RequestURI()
	)

	app.logger.Error(err.Error(), "method", method, "uri", uri)
}

func (app *App) badRequestResponse(w http.ResponseWriter, r *http.Request, err error) {
	httpError := &HTTPError{StatusCode: http.StatusBadRequest, Error: ErrorPayload{Code: strconv.Itoa(http.StatusBadRequest), Message: err.Error()}}
	app.errorResponse(w, r, httpError)
}

func (app *App) forbiddenResponse(w http.ResponseWriter, r *http.Request, message string) { //nolint:unused
	// Log the detailed error message as a warning
	app.logger.Warn("Access forbidden", "message", message, "method", r.Method, "uri", r.URL.RequestURI())

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

	statusCode := http.StatusInternalServerError
	message := err.Error()

	var upstreamErr *maas.MaasUpstreamError
	if errors.As(err, &upstreamErr) {
		message = upstreamErr.Error()
		switch {
		case upstreamErr.StatusCode == 0, upstreamErr.StatusCode >= http.StatusInternalServerError:
			statusCode = http.StatusServiceUnavailable
		default:
			statusCode = http.StatusBadGateway
		}
	}

	httpError := &HTTPError{
		StatusCode: statusCode,
		Error: ErrorPayload{
			Code:    strconv.Itoa(statusCode),
			Message: message,
		},
	}
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
