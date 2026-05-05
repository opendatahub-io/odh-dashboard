package api

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/opendatahub-io/gen-ai/internal/constants"
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
		Error: &integrations.ErrorDetail{
			Component: "bff",
			Code:      "bad_request",
			Message:   err.Error(),
			Retriable: false,
		},
	}
	app.frontendErrorResponse(w, r, http.StatusBadRequest, frontendError)
}

func (app *App) guardrailViolationResponse(w http.ResponseWriter, r *http.Request, code string, msg string) {
	httpError := &integrations.HTTPError{
		StatusCode: http.StatusBadRequest,
		ErrorResponse: integrations.ErrorResponse{
			Code:    code,
			Message: msg,
		},
	}
	app.errorResponse(w, r, httpError)
}

func (app *App) unauthorizedResponse(w http.ResponseWriter, r *http.Request, err error) {
	frontendError := &integrations.FrontendErrorResponse{
		Error: &integrations.ErrorDetail{
			Component: "bff",
			Code:      "unauthorized",
			Message:   err.Error(),
			Retriable: false,
		},
	}
	app.frontendErrorResponse(w, r, http.StatusUnauthorized, frontendError)
}

// TODO: remove nolint comment below when we use this method
//
//nolint:unused
func (app *App) forbiddenResponse(w http.ResponseWriter, r *http.Request, message string) {
	frontendError := &integrations.FrontendErrorResponse{
		Error: &integrations.ErrorDetail{
			Component: "bff",
			Code:      "forbidden",
			Message:   message,
			Retriable: false,
		},
	}
	app.frontendErrorResponse(w, r, http.StatusForbidden, frontendError)
}

func (app *App) conflictResponse(w http.ResponseWriter, r *http.Request, err error) {
	frontendError := &integrations.FrontendErrorResponse{
		Error: &integrations.ErrorDetail{
			Component: "bff",
			Code:      "conflict",
			Message:   err.Error(),
			Retriable: false,
		},
	}
	app.frontendErrorResponse(w, r, http.StatusConflict, frontendError)
}

func (app *App) errorResponse(w http.ResponseWriter, r *http.Request, error *integrations.HTTPError) {

	env := ErrorEnvelope{Error: error}

	err := app.WriteJSON(w, error.StatusCode, env, nil)

	if err != nil {
		app.LogError(r, err)
		w.WriteHeader(error.StatusCode)
	}
}

func (app *App) serviceUnavailableResponse(w http.ResponseWriter, r *http.Request, err error) {
	app.LogError(r, err)

	httpError := &integrations.HTTPError{
		StatusCode: http.StatusServiceUnavailable,
		ErrorResponse: integrations.ErrorResponse{
			Code:    constants.GuardrailServiceUnavailableCode,
			Message: err.Error(),
		},
	}
	app.errorResponse(w, r, httpError)
}
func (app *App) frontendErrorResponse(w http.ResponseWriter, r *http.Request, status int, frontendError *integrations.FrontendErrorResponse) {
	err := app.WriteJSON(w, status, frontendError, nil)

	if err != nil {
		app.LogError(r, err)
		w.WriteHeader(status)
	}
}

func (app *App) serverErrorResponse(w http.ResponseWriter, r *http.Request, err error) {
	app.LogError(r, err)

	frontendError := &integrations.FrontendErrorResponse{
		Error: &integrations.ErrorDetail{
			Component: "bff",
			Code:      "internal_error",
			Message:   "the server encountered a problem and could not process your request",
			Retriable: true,
		},
	}
	app.frontendErrorResponse(w, r, http.StatusInternalServerError, frontendError)
}

func (app *App) notFoundResponse(w http.ResponseWriter, r *http.Request) {
	frontendError := &integrations.FrontendErrorResponse{
		Error: &integrations.ErrorDetail{
			Component: "bff",
			Code:      "not_found",
			Message:   "the requested resource could not be found",
			Retriable: false,
		},
	}
	app.frontendErrorResponse(w, r, http.StatusNotFound, frontendError)
}

func (app *App) methodNotAllowedResponse(w http.ResponseWriter, r *http.Request) {
	frontendError := &integrations.FrontendErrorResponse{
		Error: &integrations.ErrorDetail{
			Component: "bff",
			Code:      "method_not_allowed",
			Message:   fmt.Sprintf("the %s method is not supported for this resource", r.Method),
			Retriable: false,
		},
	}
	app.frontendErrorResponse(w, r, http.StatusMethodNotAllowed, frontendError)
}

// TODO remove nolint comment below when we use this method
func (app *App) failedValidationResponse(w http.ResponseWriter, r *http.Request, errors map[string]string) { //nolint:unused

	message, err := json.Marshal(errors)
	if err != nil {
		message = []byte("{}")
	}
	frontendError := &integrations.FrontendErrorResponse{
		Error: &integrations.ErrorDetail{
			Component: "bff",
			Code:      "validation_failed",
			Message:   string(message),
			Retriable: false,
		},
	}
	app.frontendErrorResponse(w, r, http.StatusUnprocessableEntity, frontendError)
}
