package api

import (
	"encoding/json"
	"fmt"
	"net/http"

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

func (app *App) badRequestResponse(w http.ResponseWriter, r *http.Request, err error) {
	frontendError := &integrations.FrontendErrorResponse{
		Status: http.StatusBadRequest,
		Error: &integrations.ErrorDetail{
			Component: "bff",
			Code:      "bad_request",
			Message:   err.Error(),
			Retriable: false,
		},
	}
	app.frontendErrorResponse(w, r, frontendError)
}

func (app *App) unauthorizedResponse(w http.ResponseWriter, r *http.Request, err error) {
	frontendError := &integrations.FrontendErrorResponse{
		Status: http.StatusUnauthorized,
		Error: &integrations.ErrorDetail{
			Component: "bff",
			Code:      "unauthorized",
			Message:   err.Error(),
			Retriable: false,
		},
	}
	app.frontendErrorResponse(w, r, frontendError)
}

// TODO: remove nolint comment below when we use this method
//
//nolint:unused
func (app *App) forbiddenResponse(w http.ResponseWriter, r *http.Request, message string) {
	frontendError := &integrations.FrontendErrorResponse{
		Status: http.StatusForbidden,
		Error: &integrations.ErrorDetail{
			Component: "bff",
			Code:      "forbidden",
			Message:   message,
			Retriable: false,
		},
	}
	app.frontendErrorResponse(w, r, frontendError)
}

func (app *App) conflictResponse(w http.ResponseWriter, r *http.Request, err error) {
	frontendError := &integrations.FrontendErrorResponse{
		Status: http.StatusConflict,
		Error: &integrations.ErrorDetail{
			Component: "bff",
			Code:      "conflict",
			Message:   err.Error(),
			Retriable: false,
		},
	}
	app.frontendErrorResponse(w, r, frontendError)
}

func (app *App) errorResponse(w http.ResponseWriter, r *http.Request, error *integrations.HTTPError) {

	env := ErrorEnvelope{Error: error}

	err := app.WriteJSON(w, error.StatusCode, env, nil)

	if err != nil {
		app.LogError(r, err)
		w.WriteHeader(error.StatusCode)
	}
}

func (app *App) frontendErrorResponse(w http.ResponseWriter, r *http.Request, frontendError *integrations.FrontendErrorResponse) {
	err := app.WriteJSON(w, frontendError.Status, frontendError, nil)

	if err != nil {
		app.LogError(r, err)
		w.WriteHeader(frontendError.Status)
	}
}

func (app *App) serverErrorResponse(w http.ResponseWriter, r *http.Request, err error) {
	app.LogError(r, err)

	frontendError := &integrations.FrontendErrorResponse{
		Status: http.StatusInternalServerError,
		Error: &integrations.ErrorDetail{
			Component: "bff",
			Code:      "internal_error",
			Message:   "the server encountered a problem and could not process your request",
			Retriable: true,
		},
	}
	app.frontendErrorResponse(w, r, frontendError)
}

func (app *App) notFoundResponse(w http.ResponseWriter, r *http.Request) {
	frontendError := &integrations.FrontendErrorResponse{
		Status: http.StatusNotFound,
		Error: &integrations.ErrorDetail{
			Component: "bff",
			Code:      "not_found",
			Message:   "the requested resource could not be found",
			Retriable: false,
		},
	}
	app.frontendErrorResponse(w, r, frontendError)
}

func (app *App) methodNotAllowedResponse(w http.ResponseWriter, r *http.Request) {
	frontendError := &integrations.FrontendErrorResponse{
		Status: http.StatusMethodNotAllowed,
		Error: &integrations.ErrorDetail{
			Component: "bff",
			Code:      "method_not_allowed",
			Message:   fmt.Sprintf("the %s method is not supported for this resource", r.Method),
			Retriable: false,
		},
	}
	app.frontendErrorResponse(w, r, frontendError)
}

// TODO remove nolint comment below when we use this method
func (app *App) failedValidationResponse(w http.ResponseWriter, r *http.Request, errors map[string]string) { //nolint:unused

	message, err := json.Marshal(errors)
	if err != nil {
		message = []byte("{}")
	}
	frontendError := &integrations.FrontendErrorResponse{
		Status: http.StatusUnprocessableEntity,
		Error: &integrations.ErrorDetail{
			Component: "bff",
			Code:      "validation_failed",
			Message:   string(message),
			Retriable: false,
		},
	}
	app.frontendErrorResponse(w, r, frontendError)
}
