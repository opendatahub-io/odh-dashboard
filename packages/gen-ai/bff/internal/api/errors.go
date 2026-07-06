package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"

	"github.com/opendatahub-io/gen-ai/internal/constants"
	helper "github.com/opendatahub-io/gen-ai/internal/helpers"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/bffclient"
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
	// Check if err is already an HTTPError with a custom code
	if httpErr, ok := err.(*integrations.HTTPError); ok && httpErr.Code != "" {
		app.errorResponse(w, r, httpErr)
		return
	}

	httpError := &integrations.HTTPError{
		StatusCode: http.StatusBadRequest,
		ErrorResponse: integrations.ErrorResponse{
			Code:    strconv.Itoa(http.StatusBadRequest),
			Message: err.Error(),
		},
	}
	app.errorResponse(w, r, httpError)
}

func (app *App) guardrailViolationResponse(w http.ResponseWriter, r *http.Request, code string, msg string) {
	frontendErr := &integrations.FrontendErrorResponse{
		StatusCode: http.StatusBadRequest,
		Error: &integrations.ErrorDetail{
			Component: "guardrails",
			Code:      code,
			Message:   msg,
			Retriable: false,
		},
	}
	if writeErr := app.WriteJSON(w, frontendErr.StatusCode, frontendErr, nil); writeErr != nil {
		app.LogError(r, writeErr)
		w.WriteHeader(frontendErr.StatusCode)
	}
}

func (app *App) guardrailServiceUnavailableResponse(w http.ResponseWriter, r *http.Request, err error) {
	app.LogError(r, err)

	frontendErr := &integrations.FrontendErrorResponse{
		StatusCode: http.StatusServiceUnavailable,
		Error: &integrations.ErrorDetail{
			Component: "guardrails",
			Code:      constants.GuardrailServiceUnavailableCode,
			Message:   err.Error(),
			Retriable: false,
		},
	}
	if writeErr := app.WriteJSON(w, frontendErr.StatusCode, frontendErr, nil); writeErr != nil {
		app.LogError(r, writeErr)
		w.WriteHeader(frontendErr.StatusCode)
	}
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

func (app *App) conflictResponse(w http.ResponseWriter, r *http.Request, err error) {
	httpError := &integrations.HTTPError{
		StatusCode: http.StatusConflict,
		ErrorResponse: integrations.ErrorResponse{
			Code:    "conflict",
			Message: err.Error(),
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

func (app *App) payloadTooLargeResponse(w http.ResponseWriter, r *http.Request, limit int64) {
	limitMB := float64(limit) / (1 << 20)
	app.LogError(r, fmt.Errorf("request body exceeds the %.0fMB limit", limitMB))
	httpError := &integrations.HTTPError{
		StatusCode: http.StatusRequestEntityTooLarge,
		ErrorResponse: integrations.ErrorResponse{
			Code:    strconv.Itoa(http.StatusRequestEntityTooLarge),
			Message: fmt.Sprintf("request body exceeds the %.0fMB limit", limitMB),
		},
	}
	app.errorResponse(w, r, httpError)
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

// handleBFFClientError maps BFF client errors to appropriate HTTP responses
func (app *App) handleBFFClientError(w http.ResponseWriter, r *http.Request, err error) {
	var bffErr *bffclient.BFFClientError
	if errors.As(err, &bffErr) {
		// Validate status code range to prevent WriteHeader panics
		statusCode := bffErr.StatusCode
		if statusCode < 100 || statusCode > 999 {
			statusCode = http.StatusBadGateway
		}

		// For server errors (5xx), use generic message and code for client and log sanitized details
		// For client errors (4xx), include the original message and code
		message := bffErr.Message
		code := bffErr.Code
		if statusCode >= 500 {
			// Log error with sanitized content to avoid leaking sensitive upstream data
			logger := helper.GetContextLoggerFromReq(r)
			logger.Error("BFF client error (5xx)",
				"status", statusCode,
				"code", bffErr.Code,
				// Don't log bffErr.Message - may contain sensitive upstream response bodies
				// Don't log bffErr.Target - may expose internal service topology
			)
			// Use generic message and code for client to avoid leaking inter-service topology
			message = http.StatusText(statusCode)
			if message == "" {
				message = "internal server error"
			}
			code = "internal_error"
		}

		httpError := &integrations.HTTPError{
			StatusCode: statusCode,
			ErrorResponse: integrations.ErrorResponse{
				Code:    code,
				Message: message,
			},
		}
		app.errorResponse(w, r, httpError)
	} else {
		app.serverErrorResponse(w, r, err)
	}
}

// maasBFFUnavailableResponse returns a service unavailable error when MaaS BFF client is not available
func (app *App) maasBFFUnavailableResponse(w http.ResponseWriter, r *http.Request) {
	app.LogError(r, fmt.Errorf("MaaS BFF client not available"))

	app.errorResponse(w, r, &integrations.HTTPError{
		StatusCode: http.StatusServiceUnavailable,
		ErrorResponse: integrations.ErrorResponse{
			Code:    "service_unavailable",
			Message: "MaaS BFF is not available",
		},
	})
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
