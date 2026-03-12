package api

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/opendatahub-io/autorag-library/bff/internal/integrations"
)

type ErrorEnvelope struct {
	Error *integrations.HTTPError `json:"error"`
}

func (app *App) LogError(r *http.Request, err error) {
	var (
		method = r.Method
		uri    = r.URL.Path
	)

	app.logger.Error(err.Error(), "method", method, "uri", uri)
}

func (app *App) badRequestResponse(w http.ResponseWriter, r *http.Request, err error) {
	httpError := &integrations.HTTPError{
		StatusCode: http.StatusBadRequest,
		ErrorResponse: integrations.ErrorResponse{
			Code:    strconv.Itoa(http.StatusBadRequest),
			Message: err.Error(),
		},
	}
	app.errorResponse(w, r, httpError)
}

func (app *App) forbiddenResponse(w http.ResponseWriter, r *http.Request, message string) {
	httpError := &integrations.HTTPError{
		StatusCode: http.StatusForbidden,
		ErrorResponse: integrations.ErrorResponse{
			Code:    strconv.Itoa(http.StatusForbidden),
			Message: message,
		},
	}
	app.errorResponse(w, r, httpError)
}

func (app *App) unauthorizedResponse(w http.ResponseWriter, r *http.Request, message string) {
	// Log the detailed error message as a warning
	app.logger.Warn("Access unauthorized", "message", message, "method", r.Method, "uri", r.URL.Path)

	httpError := &integrations.HTTPError{
		StatusCode: http.StatusUnauthorized,
		ErrorResponse: integrations.ErrorResponse{
			Code:    strconv.Itoa(http.StatusUnauthorized),
			Message: "Access unauthorized",
		},
	}
	app.errorResponse(w, r, httpError)
}

func (app *App) errorResponse(w http.ResponseWriter, r *http.Request, error *integrations.HTTPError) {

	env := ErrorEnvelope{Error: error}

	err := app.WriteJSON(w, error.StatusCode, env, nil)

	if err != nil {
		app.LogError(r, err)
		w.WriteHeader(error.StatusCode)
	}
}

func (app *App) serverErrorResponse(w http.ResponseWriter, r *http.Request, err error) {
	app.LogError(r, err)

	httpError := &integrations.HTTPError{
		StatusCode: http.StatusInternalServerError,
		ErrorResponse: integrations.ErrorResponse{
			Code:    strconv.Itoa(http.StatusInternalServerError),
			Message: "the server encountered a problem and could not process your request",
		},
	}
	app.errorResponse(w, r, httpError)
}

func (app *App) serverErrorResponseWithMessage(w http.ResponseWriter, r *http.Request, err error, message string) {
	app.LogError(r, err)

	httpError := &integrations.HTTPError{
		StatusCode: http.StatusInternalServerError,
		ErrorResponse: integrations.ErrorResponse{
			Code:    strconv.Itoa(http.StatusInternalServerError),
			Message: message,
		},
	}
	app.errorResponse(w, r, httpError)
}

func (app *App) notFoundResponse(w http.ResponseWriter, r *http.Request) {

	httpError := &integrations.HTTPError{
		StatusCode: http.StatusNotFound,
		ErrorResponse: integrations.ErrorResponse{
			Code:    strconv.Itoa(http.StatusNotFound),
			Message: "the requested resource could not be found",
		},
	}
	app.errorResponse(w, r, httpError)
}

func (app *App) notFoundResponseWithMessage(w http.ResponseWriter, r *http.Request, message string) {
	app.logger.Warn("Resource not found", "message", message, "method", r.Method, "uri", r.URL.Path)

	httpError := &integrations.HTTPError{
		StatusCode: http.StatusNotFound,
		ErrorResponse: integrations.ErrorResponse{
			Code:    strconv.Itoa(http.StatusNotFound),
			Message: message,
		},
	}
	app.errorResponse(w, r, httpError)
}

func (app *App) methodNotAllowedResponse(w http.ResponseWriter, r *http.Request) {

	httpError := &integrations.HTTPError{
		StatusCode: http.StatusMethodNotAllowed,
		ErrorResponse: integrations.ErrorResponse{
			Code:    strconv.Itoa(http.StatusMethodNotAllowed),
			Message: fmt.Sprintf("the %s method is not supported for this resource", r.Method),
		},
	}
	app.errorResponse(w, r, httpError)
}

func (app *App) serviceUnavailableResponse(w http.ResponseWriter, r *http.Request, err error) { //nolint:unused
	app.LogError(r, err)

	httpError := &integrations.HTTPError{
		StatusCode: http.StatusServiceUnavailable,
		ErrorResponse: integrations.ErrorResponse{
			Code:    strconv.Itoa(http.StatusServiceUnavailable),
			Message: "service temporarily unavailable",
		},
	}
	app.errorResponse(w, r, httpError)
}

func (app *App) serviceUnavailableResponseWithMessage(w http.ResponseWriter, r *http.Request, err error, message string) {
	app.LogError(r, err)

	httpError := &integrations.HTTPError{
		StatusCode: http.StatusServiceUnavailable,
		ErrorResponse: integrations.ErrorResponse{
			Code:    strconv.Itoa(http.StatusServiceUnavailable),
			Message: message,
		},
	}
	app.errorResponse(w, r, httpError)
}
