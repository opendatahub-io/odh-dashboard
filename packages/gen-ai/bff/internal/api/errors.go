package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	helper "github.com/opendatahub-io/gen-ai/internal/helpers"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
)

type HTTPError struct {
	StatusCode int `json:"-"`
	ErrorResponse
}

type ErrorResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type ErrorEnvelope struct {
	Error *integrations.HTTPError `json:"error"`
}

func (app *App) LogError(r *http.Request, err error) {
	var (
		method = r.Method
		uri    = r.URL.RequestURI()
	)

	logger := helper.GetContextLoggerFromReq(r)
	logger.Error(err.Error(), "method", method, "uri", uri)
}

// TODO: remove nolint comment below when we use this method
//
//nolint:unused
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

func (app *App) unauthorizedResponse(w http.ResponseWriter, r *http.Request, err error) {
	httpError := &integrations.HTTPError{
		StatusCode: http.StatusUnauthorized,
		ErrorResponse: integrations.ErrorResponse{
			Code:    strconv.Itoa(http.StatusUnauthorized),
			Message: err.Error(),
		},
	}
	app.errorResponse(w, r, httpError)
}

// TODO: remove nolint comment below when we use this method
//
//nolint:unused
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

func (app *App) modelNotFoundResponse(w http.ResponseWriter, r *http.Request, model string) {

	httpError := &integrations.HTTPError{
		StatusCode: http.StatusNotFound,
		ErrorResponse: integrations.ErrorResponse{
			Code:    strconv.Itoa(http.StatusNotFound),
			Message: fmt.Sprintf("model '%s' not found or is not available", model),
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

// TODO remove nolint comment below when we use this method
func (app *App) failedValidationResponse(w http.ResponseWriter, r *http.Request, errors map[string]string) { //nolint:unused

	message, err := json.Marshal(errors)
	if err != nil {
		message = []byte("{}")
	}
	httpError := &integrations.HTTPError{
		StatusCode: http.StatusUnprocessableEntity,
		ErrorResponse: integrations.ErrorResponse{
			Code:    strconv.Itoa(http.StatusUnprocessableEntity),
			Message: string(message),
		},
	}
	app.errorResponse(w, r, httpError)
}
