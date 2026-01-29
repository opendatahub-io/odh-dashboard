package api

import (
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack"
	"github.com/stretchr/testify/assert"
)

func TestHandleLlamaStackClientError(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{Level: slog.LevelDebug}))
	app := &App{
		logger: logger,
	}

	testCases := []struct {
		name                 string
		inputError           error
		expectedStatusCode   int
		expectedBodyContains string
	}{
		{
			name:                 "LlamaStackError with InvalidRequest code",
			inputError:           llamastack.NewInvalidRequestError("input is required"),
			expectedStatusCode:   http.StatusBadRequest,
			expectedBodyContains: "bad_request",
		},
		{
			name:                 "LlamaStackError with Unauthorized code",
			inputError:           llamastack.NewUnauthorizedError("invalid token"),
			expectedStatusCode:   http.StatusUnauthorized,
			expectedBodyContains: "unauthorized",
		},
		{
			name:                 "LlamaStackError with NotFound code",
			inputError:           llamastack.NewNotFoundError("resource not found"),
			expectedStatusCode:   http.StatusNotFound,
			expectedBodyContains: "not_found",
		},
		{
			name:                 "LlamaStackError with ConnectionFailed code",
			inputError:           llamastack.NewConnectionError("connection refused"),
			expectedStatusCode:   http.StatusBadGateway,
			expectedBodyContains: "bad_gateway",
		},
		{
			name:                 "Generic error (not LlamaStackError)",
			inputError:           errors.New("generic error message"),
			expectedStatusCode:   http.StatusInternalServerError,
			expectedBodyContains: "the server encountered a problem",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			rr := httptest.NewRecorder()
			req := httptest.NewRequest("GET", "/test", nil)

			app.handleLlamaStackClientError(rr, req, tc.inputError)

			assert.Equal(t, tc.expectedStatusCode, rr.Code)

			body := rr.Body.String()
			assert.Contains(t, body, tc.expectedBodyContains)
		})
	}
}

func TestGetDefaultStatusCodeForLlamaStackClientError(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{Level: slog.LevelDebug}))
	app := &App{
		logger: logger,
	}

	testCases := []struct {
		name               string
		errorCode          string
		expectedStatusCode int
	}{
		{
			name:               "InvalidRequest code returns 400",
			errorCode:          llamastack.ErrCodeInvalidRequest,
			expectedStatusCode: http.StatusBadRequest,
		},
		{
			name:               "Unauthorized code returns 401",
			errorCode:          llamastack.ErrCodeUnauthorized,
			expectedStatusCode: http.StatusUnauthorized,
		},
		{
			name:               "NotFound code returns 404",
			errorCode:          llamastack.ErrCodeNotFound,
			expectedStatusCode: http.StatusNotFound,
		},
		{
			name:               "Timeout code returns 503",
			errorCode:          llamastack.ErrCodeTimeout,
			expectedStatusCode: http.StatusServiceUnavailable,
		},
		{
			name:               "ConnectionFailed code returns 502",
			errorCode:          llamastack.ErrCodeConnectionFailed,
			expectedStatusCode: http.StatusBadGateway,
		},
		{
			name:               "ServerUnavailable code returns 503",
			errorCode:          llamastack.ErrCodeServerUnavailable,
			expectedStatusCode: http.StatusServiceUnavailable,
		},
		{
			name:               "Unknown code returns 500",
			errorCode:          "unknown_code",
			expectedStatusCode: http.StatusInternalServerError,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			statusCode := app.getDefaultStatusCodeForLlamaStackClientError(tc.errorCode)
			assert.Equal(t, tc.expectedStatusCode, statusCode)
		})
	}
}

func TestMapLlamaStackClientErrorToHTTPError(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{Level: slog.LevelDebug}))
	app := &App{
		logger: logger,
	}

	testCases := []struct {
		name               string
		lsErr              *llamastack.LlamaStackError
		statusCode         int
		expectedCode       string
		expectedStatusCode int
		expectedMessage    string
	}{
		{
			name:               "bad request error",
			lsErr:              llamastack.NewInvalidRequestError("input is required"),
			statusCode:         http.StatusBadRequest,
			expectedCode:       "bad_request",
			expectedStatusCode: http.StatusBadRequest,
			expectedMessage:    "input is required",
		},
		{
			name:               "unauthorized error",
			lsErr:              llamastack.NewUnauthorizedError("invalid token"),
			statusCode:         http.StatusUnauthorized,
			expectedCode:       "unauthorized",
			expectedStatusCode: http.StatusUnauthorized,
			expectedMessage:    "invalid token",
		},
		{
			name:               "not found error",
			lsErr:              llamastack.NewNotFoundError("resource not found"),
			statusCode:         http.StatusNotFound,
			expectedCode:       "not_found",
			expectedStatusCode: http.StatusNotFound,
			expectedMessage:    "resource not found",
		},
		{
			name:               "connection error (bad gateway)",
			lsErr:              llamastack.NewConnectionError("connection refused"),
			statusCode:         http.StatusBadGateway,
			expectedCode:       "bad_gateway",
			expectedStatusCode: http.StatusBadGateway,
			expectedMessage:    "connection refused",
		},
		{
			name:               "internal server error",
			lsErr:              llamastack.NewLlamaStackError(llamastack.ErrCodeInternalError, "internal error", 500),
			statusCode:         http.StatusInternalServerError,
			expectedCode:       "internal_server_error",
			expectedStatusCode: http.StatusInternalServerError,
			expectedMessage:    "internal error",
		},
		{
			name:               "unknown status code",
			lsErr:              llamastack.NewLlamaStackError("CUSTOM_ERROR", "custom error", http.StatusTeapot),
			statusCode:         http.StatusTeapot,
			expectedCode:       "llamastack_error",
			expectedStatusCode: http.StatusTeapot,
			expectedMessage:    "LlamaStack client error (HTTP 418): custom error",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			httpError := app.mapLlamaStackClientErrorToHTTPError(tc.lsErr, tc.statusCode)

			assert.Equal(t, tc.expectedStatusCode, httpError.StatusCode)
			assert.Equal(t, tc.expectedCode, httpError.Code)
			assert.Equal(t, tc.expectedMessage, httpError.Message)
		})
	}
}

// Integration test combining multiple helper functions
func TestLlamaStackHelpersIntegration(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{Level: slog.LevelDebug}))
	app := &App{
		logger: logger,
	}

	t.Run("should handle LlamaStackError with invalid request code", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/test", nil)
		rr := httptest.NewRecorder()

		lsErr := llamastack.NewInvalidRequestError("input is required")

		app.handleLlamaStackClientError(rr, req, lsErr)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), `"code": "bad_request"`)
		assert.Contains(t, rr.Body.String(), "input is required")
	})

	t.Run("should handle LlamaStackError with not found", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/test", nil)
		rr := httptest.NewRecorder()

		lsErr := llamastack.NewNotFoundError("resource not found")

		app.handleLlamaStackClientError(rr, req, lsErr)

		assert.Equal(t, http.StatusNotFound, rr.Code)
		assert.Contains(t, rr.Body.String(), `"code": "not_found"`)
		assert.Contains(t, rr.Body.String(), "resource not found")
	})

	t.Run("should fall back to serverErrorResponse for unknown error type", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/test", nil)
		rr := httptest.NewRecorder()

		regularErr := fmt.Errorf("regular Go error")

		app.handleLlamaStackClientError(rr, req, regularErr)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
		assert.Contains(t, rr.Body.String(), "the server encountered a problem")
	})
}
