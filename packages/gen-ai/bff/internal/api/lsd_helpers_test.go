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
			name:                 "LlamaStackError with InvalidRequest code - generic error",
			inputError:           llamastack.NewInvalidRequestError("input is required"),
			expectedStatusCode:   http.StatusBadRequest,
			expectedBodyContains: "generic_error",
		},
		{
			name:                 "LlamaStackError with InvalidRequest code - parameter error",
			inputError:           llamastack.NewInvalidRequestError("temperature invalid"),
			expectedStatusCode:   http.StatusBadRequest,
			expectedBodyContains: "invalid_parameter",
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
		name                    string
		lsErr                   *llamastack.LlamaStackError
		statusCode              int
		expectedCode            string
		expectedStatusCode      int
		expectedMessageContains string
	}{
		{
			name:                    "bad request with invalid parameter - uses category code",
			lsErr:                   llamastack.NewInvalidRequestError("temperature must be between 0.0 and 2.0"),
			statusCode:              http.StatusBadRequest,
			expectedCode:            "invalid_parameter",
			expectedStatusCode:      http.StatusBadRequest,
			expectedMessageContains: "parameters are invalid",
		},
		{
			name:                    "bad request with token limit - uses category code",
			lsErr:                   llamastack.NewInvalidRequestError("max_tokens exceeds limit"),
			statusCode:              http.StatusBadRequest,
			expectedCode:            "invalid_model_config",
			expectedStatusCode:      http.StatusBadRequest,
			expectedMessageContains: "configuration is invalid",
		},
		{
			name:                    "bad request with generic error - uses generic category",
			lsErr:                   llamastack.NewInvalidRequestError("some generic error"),
			statusCode:              http.StatusBadRequest,
			expectedCode:            "generic_error",
			expectedStatusCode:      http.StatusBadRequest,
			expectedMessageContains: "some generic error",
		},
		{
			name:                    "unauthorized error - uses hardcoded code",
			lsErr:                   llamastack.NewUnauthorizedError("invalid token"),
			statusCode:              http.StatusUnauthorized,
			expectedCode:            "unauthorized",
			expectedStatusCode:      http.StatusUnauthorized,
			expectedMessageContains: "invalid token",
		},
		{
			name:                    "not found error - uses hardcoded code",
			lsErr:                   llamastack.NewNotFoundError("resource not found"),
			statusCode:              http.StatusNotFound,
			expectedCode:            "not_found",
			expectedStatusCode:      http.StatusNotFound,
			expectedMessageContains: "resource not found",
		},
		{
			name:                    "connection error - uses hardcoded code",
			lsErr:                   llamastack.NewConnectionError("connection refused"),
			statusCode:              http.StatusBadGateway,
			expectedCode:            "bad_gateway",
			expectedStatusCode:      http.StatusBadGateway,
			expectedMessageContains: "connection refused",
		},
		{
			name:                    "service unavailable - uses hardcoded code",
			lsErr:                   llamastack.NewLlamaStackError(llamastack.ErrCodeServerUnavailable, "service down", 503),
			statusCode:              http.StatusServiceUnavailable,
			expectedCode:            "service_unavailable",
			expectedStatusCode:      http.StatusServiceUnavailable,
			expectedMessageContains: "service down",
		},
		{
			name:                    "internal server error with timeout - uses category code",
			lsErr:                   llamastack.NewLlamaStackError(llamastack.ErrCodeInternalError, "request timed out", 500),
			statusCode:              http.StatusInternalServerError,
			expectedCode:            "model_timeout",
			expectedStatusCode:      http.StatusInternalServerError,
			expectedMessageContains: "timed out",
		},
		{
			name:                    "internal server error with overload - uses category code",
			lsErr:                   llamastack.NewLlamaStackError(llamastack.ErrCodeInternalError, "model is currently overloaded", 500),
			statusCode:              http.StatusInternalServerError,
			expectedCode:            "model_overloaded",
			expectedStatusCode:      http.StatusInternalServerError,
			expectedMessageContains: "overloaded",
		},
		{
			name:                    "internal server error generic - uses category code",
			lsErr:                   llamastack.NewLlamaStackError(llamastack.ErrCodeInternalError, "internal error", 500),
			statusCode:              http.StatusInternalServerError,
			expectedCode:            "generic_error",
			expectedStatusCode:      http.StatusInternalServerError,
			expectedMessageContains: "internal error",
		},
		{
			name:                    "unknown status code with RAG error - uses category code",
			lsErr:                   llamastack.NewLlamaStackError("CUSTOM_ERROR", "vector store not found", 418),
			statusCode:              http.StatusTeapot,
			expectedCode:            "rag_vector_store_not_found",
			expectedStatusCode:      http.StatusTeapot,
			expectedMessageContains: "vector store",
		},
		{
			name:                    "unknown status code with guardrails violation - uses category code",
			lsErr:                   llamastack.NewLlamaStackError("CUSTOM_ERROR", "content blocked by guardrails", 418),
			statusCode:              http.StatusTeapot,
			expectedCode:            "guardrails_violation",
			expectedStatusCode:      http.StatusTeapot,
			expectedMessageContains: "blocked by guardrails",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			httpError := app.mapLlamaStackClientErrorToHTTPError(tc.lsErr, tc.statusCode)

			assert.Equal(t, tc.expectedStatusCode, httpError.StatusCode)
			assert.Equal(t, tc.expectedCode, httpError.Code)
			assert.Contains(t, httpError.Message, tc.expectedMessageContains)
		})
	}
}

// Integration test combining multiple helper functions
func TestLlamaStackHelpersIntegration(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{Level: slog.LevelDebug}))
	app := &App{
		logger: logger,
	}

	t.Run("should handle LlamaStackError with invalid request code and categorize", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/test", nil)
		rr := httptest.NewRecorder()

		lsErr := llamastack.NewInvalidRequestError("input is required")

		app.handleLlamaStackClientError(rr, req, lsErr)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		// Generic error gets generic_error category
		assert.Contains(t, rr.Body.String(), `"code": "generic_error"`)
		assert.Contains(t, rr.Body.String(), "input is required")
	})

	t.Run("should handle LlamaStackError with parameter validation error", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/test", nil)
		rr := httptest.NewRecorder()

		lsErr := llamastack.NewInvalidRequestError("temperature out of range")

		app.handleLlamaStackClientError(rr, req, lsErr)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		// Temperature error gets invalid_parameter category
		assert.Contains(t, rr.Body.String(), `"code": "invalid_parameter"`)
		assert.Contains(t, rr.Body.String(), "parameters are invalid")
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

		regularErr := errors.New("regular Go error")

		app.handleLlamaStackClientError(rr, req, regularErr)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
		assert.Contains(t, rr.Body.String(), "the server encountered a problem")
	})

	t.Run("should categorize RAG errors correctly", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/test", nil)
		rr := httptest.NewRecorder()

		lsErr := llamastack.NewInvalidRequestError("vector store 'vs_123' not found")

		app.handleLlamaStackClientError(rr, req, lsErr)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), `"code": "rag_vector_store_not_found"`)
		assert.Contains(t, rr.Body.String(), "vector store")
	})

	t.Run("should categorize timeout errors correctly", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/test", nil)
		rr := httptest.NewRecorder()

		lsErr := llamastack.NewLlamaStackError(llamastack.ErrCodeInternalError, "request timed out", 500)

		app.handleLlamaStackClientError(rr, req, lsErr)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
		assert.Contains(t, rr.Body.String(), `"code": "model_timeout"`)
		assert.Contains(t, rr.Body.String(), "timed out")
	})
}
