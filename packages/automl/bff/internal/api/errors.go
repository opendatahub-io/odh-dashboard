package api

import (
	"fmt"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/opendatahub-io/automl-library/bff/internal/integrations"
)

type ErrorEnvelope struct {
	Error *integrations.HTTPError `json:"error"`
}

func logError(logger *slog.Logger, r *http.Request, err error) {
	var (
		method = r.Method
		uri    = r.URL.Path
	)

	logger.Error(err.Error(), "method", method, "uri", uri)
}

func payloadTooLargeResponse(logger *slog.Logger, w http.ResponseWriter, r *http.Request, message string) {
	httpError := &integrations.HTTPError{
		StatusCode: http.StatusRequestEntityTooLarge,
		ErrorResponse: integrations.ErrorResponse{
			Code:    strconv.Itoa(http.StatusRequestEntityTooLarge),
			Message: message,
		},
	}
	errorResponse(logger, w, r, httpError)
}

func badRequestResponse(logger *slog.Logger, w http.ResponseWriter, r *http.Request, message string) {
	httpError := &integrations.HTTPError{
		StatusCode: http.StatusBadRequest,
		ErrorResponse: integrations.ErrorResponse{
			Code:    strconv.Itoa(http.StatusBadRequest),
			Message: message,
		},
	}
	errorResponse(logger, w, r, httpError)
}

func forbiddenResponse(logger *slog.Logger, w http.ResponseWriter, r *http.Request, message string) {
	httpError := &integrations.HTTPError{
		StatusCode: http.StatusForbidden,
		ErrorResponse: integrations.ErrorResponse{
			Code:    strconv.Itoa(http.StatusForbidden),
			Message: message,
		},
	}
	errorResponse(logger, w, r, httpError)
}

func conflictResponse(logger *slog.Logger, w http.ResponseWriter, r *http.Request, message string) {
	httpError := &integrations.HTTPError{
		StatusCode: http.StatusConflict,
		ErrorResponse: integrations.ErrorResponse{
			Code:    strconv.Itoa(http.StatusConflict),
			Message: message,
		},
	}
	errorResponse(logger, w, r, httpError)
}

func unauthorizedResponse(logger *slog.Logger, w http.ResponseWriter, r *http.Request, message string) {
	logger.Warn("Unauthorized access attempt", "method", r.Method, "uri", r.URL.Path)

	httpError := &integrations.HTTPError{
		StatusCode: http.StatusUnauthorized,
		ErrorResponse: integrations.ErrorResponse{
			Code:    strconv.Itoa(http.StatusUnauthorized),
			Message: "Access unauthorized",
		},
	}
	errorResponse(logger, w, r, httpError)
}

func errorResponse(logger *slog.Logger, w http.ResponseWriter, r *http.Request, error *integrations.HTTPError) {

	env := ErrorEnvelope{Error: error}

	err := writeJSON(w, error.StatusCode, env, nil)

	if err != nil {
		logError(logger, r, err)
		w.WriteHeader(error.StatusCode)
	}
}

func serverErrorResponse(logger *slog.Logger, w http.ResponseWriter, r *http.Request, err error) {
	logError(logger, r, err)

	httpError := &integrations.HTTPError{
		StatusCode: http.StatusInternalServerError,
		ErrorResponse: integrations.ErrorResponse{
			Code:    strconv.Itoa(http.StatusInternalServerError),
			Message: "the server encountered a problem and could not process your request",
		},
	}
	errorResponse(logger, w, r, httpError)
}

func serverErrorResponseWithMessage(logger *slog.Logger, w http.ResponseWriter, r *http.Request, err error, message string) { //nolint:unused
	logError(logger, r, err)

	httpError := &integrations.HTTPError{
		StatusCode: http.StatusInternalServerError,
		ErrorResponse: integrations.ErrorResponse{
			Code:    strconv.Itoa(http.StatusInternalServerError),
			Message: message,
		},
	}
	errorResponse(logger, w, r, httpError)
}

func notFoundResponse(logger *slog.Logger, w http.ResponseWriter, r *http.Request) {

	httpError := &integrations.HTTPError{
		StatusCode: http.StatusNotFound,
		ErrorResponse: integrations.ErrorResponse{
			Code:    strconv.Itoa(http.StatusNotFound),
			Message: "the requested resource could not be found",
		},
	}
	errorResponse(logger, w, r, httpError)
}

func notFoundResponseWithMessage(logger *slog.Logger, w http.ResponseWriter, r *http.Request, message string) {
	logger.Warn("Resource not found", "method", r.Method, "uri", r.URL.Path, "message", message)

	httpError := &integrations.HTTPError{
		StatusCode: http.StatusNotFound,
		ErrorResponse: integrations.ErrorResponse{
			Code:    strconv.Itoa(http.StatusNotFound),
			Message: message,
		},
	}
	errorResponse(logger, w, r, httpError)
}

func methodNotAllowedResponse(logger *slog.Logger, w http.ResponseWriter, r *http.Request) {

	httpError := &integrations.HTTPError{
		StatusCode: http.StatusMethodNotAllowed,
		ErrorResponse: integrations.ErrorResponse{
			Code:    strconv.Itoa(http.StatusMethodNotAllowed),
			Message: fmt.Sprintf("the %s method is not supported for this resource", r.Method),
		},
	}
	errorResponse(logger, w, r, httpError)
}

func serviceUnavailableResponse(logger *slog.Logger, w http.ResponseWriter, r *http.Request, err error) { //nolint:unused
	logError(logger, r, err)

	httpError := &integrations.HTTPError{
		StatusCode: http.StatusServiceUnavailable,
		ErrorResponse: integrations.ErrorResponse{
			Code:    strconv.Itoa(http.StatusServiceUnavailable),
			Message: "service temporarily unavailable",
		},
	}
	errorResponse(logger, w, r, httpError)
}

func badGatewayResponseWithMessage(logger *slog.Logger, w http.ResponseWriter, r *http.Request, err error, message string) {
	logError(logger, r, err)

	httpError := &integrations.HTTPError{
		StatusCode: http.StatusBadGateway,
		ErrorResponse: integrations.ErrorResponse{
			Code:    strconv.Itoa(http.StatusBadGateway),
			Message: message,
		},
	}
	errorResponse(logger, w, r, httpError)
}

func serviceUnavailableResponseWithMessage(logger *slog.Logger, w http.ResponseWriter, r *http.Request, err error, message string) {
	logError(logger, r, err)

	httpError := &integrations.HTTPError{
		StatusCode: http.StatusServiceUnavailable,
		ErrorResponse: integrations.ErrorResponse{
			Code:    strconv.Itoa(http.StatusServiceUnavailable),
			Message: message,
		},
	}
	errorResponse(logger, w, r, httpError)
}
