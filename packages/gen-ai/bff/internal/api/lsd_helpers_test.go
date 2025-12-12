package api

import (
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/openai/openai-go/v2"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack"
	"github.com/stretchr/testify/assert"
)

func TestHandleLlamaStackError(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{Level: slog.LevelDebug}))
	app := &App{
		logger: logger,
	}

	params := llamastack.CreateResponseParams{
		Model: "test-model",
		Input: "test input",
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
			name:                 "LlamaStackError with ModelNotFound code",
			inputError:           llamastack.NewModelNotFoundError("gpt-4"),
			expectedStatusCode:   http.StatusNotFound,
			expectedBodyContains: "not_found",
		},
		{
			name:                 "LlamaStackError with ConnectionFailed code",
			inputError:           llamastack.NewConnectionError("http://localhost:8080", "connection refused"),
			expectedStatusCode:   http.StatusServiceUnavailable,
			expectedBodyContains: "service_unavailable",
		},
		{
			name: "openai.Error with NotFound status code",
			inputError: &openai.Error{
				StatusCode: http.StatusNotFound,
				Code:       "model_not_found",
				Message:    "Model not found",
				Type:       "invalid_request_error",
			},
			expectedStatusCode:   http.StatusNotFound,
			expectedBodyContains: "not_found",
		},
		{
			name: "openai.Error with Unauthorized status code",
			inputError: &openai.Error{
				StatusCode: http.StatusUnauthorized,
				Code:       "invalid_api_key",
				Message:    "Invalid API key",
				Type:       "invalid_request_error",
			},
			expectedStatusCode:   http.StatusUnauthorized,
			expectedBodyContains: "unauthorized",
		},
		{
			name: "openai.Error with BadRequest status code",
			inputError: &openai.Error{
				StatusCode: http.StatusBadRequest,
				Code:       "invalid_request",
				Message:    "Invalid request parameters",
				Type:       "invalid_request_error",
			},
			expectedStatusCode:   http.StatusBadRequest,
			expectedBodyContains: "bad_request",
		},
		{
			name: "openai.Error with InternalServerError status code",
			inputError: &openai.Error{
				StatusCode: http.StatusInternalServerError,
				Code:       "server_error",
				Message:    "Internal server error",
				Type:       "server_error",
			},
			expectedStatusCode:   http.StatusInternalServerError,
			expectedBodyContains: "internal_server_error",
		},
		{
			name: "openai.Error without status code - defaults to 500",
			inputError: &openai.Error{
				StatusCode: 0,
				Code:       "unknown_error",
				Message:    "Something went wrong",
				Type:       "unknown_error",
			},
			expectedStatusCode:   http.StatusInternalServerError,
			expectedBodyContains: "internal_server_error",
		},
		{
			name: "openai.Error with unusual status code",
			inputError: &openai.Error{
				StatusCode: http.StatusTeapot,
				Code:       "teapot_error",
				Message:    "I'm a teapot",
				Type:       "custom_error",
			},
			expectedStatusCode:   http.StatusTeapot,
			expectedBodyContains: "llamastack_error",
		},
		{
			name:                 "Generic error (not openai.Error or LlamaStackError)",
			inputError:           errors.New("generic error message"),
			expectedStatusCode:   http.StatusInternalServerError,
			expectedBodyContains: "the server encountered a problem",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			rr := httptest.NewRecorder()
			req := httptest.NewRequest("GET", "/test", nil)

			app.handleLlamaStackError(rr, req, tc.inputError, params)

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
			name:               "ModelNotFound code returns 404",
			errorCode:          llamastack.ErrCodeModelNotFound,
			expectedStatusCode: http.StatusNotFound,
		},
		{
			name:               "ConnectionFailed code returns 503",
			errorCode:          llamastack.ErrCodeConnectionFailed,
			expectedStatusCode: http.StatusServiceUnavailable,
		},
		{
			name:               "Timeout code returns 503",
			errorCode:          llamastack.ErrCodeTimeout,
			expectedStatusCode: http.StatusServiceUnavailable,
		},
		{
			name:               "ServerUnavailable code returns 503",
			errorCode:          llamastack.ErrCodeServerUnavailable,
			expectedStatusCode: http.StatusServiceUnavailable,
		},
		{
			name:               "InvalidResponse code returns 502",
			errorCode:          llamastack.ErrCodeInvalidResponse,
			expectedStatusCode: http.StatusBadGateway,
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

func TestGetDefaultStatusCodeForLlamaStackAPIError(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{Level: slog.LevelDebug}))
	app := &App{
		logger: logger,
	}

	testCases := []struct {
		name               string
		apiErr             *openai.Error
		expectedStatusCode int
	}{
		{
			name: "error with any code - always returns 500",
			apiErr: &openai.Error{
				Code:    "some_error",
				Message: "Some error message",
			},
			expectedStatusCode: http.StatusInternalServerError,
		},
		{
			name: "error with empty code - returns 500",
			apiErr: &openai.Error{
				Code:    "",
				Message: "Empty code error",
			},
			expectedStatusCode: http.StatusInternalServerError,
		},
		{
			name: "nil type - returns 500",
			apiErr: &openai.Error{
				Code:    "test",
				Message: "Test message",
				Type:    "",
			},
			expectedStatusCode: http.StatusInternalServerError,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			statusCode := app.getDefaultStatusCodeForLlamaStackAPIError(tc.apiErr)
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
			lsErr:              llamastack.NewModelNotFoundError("gpt-4"),
			statusCode:         http.StatusNotFound,
			expectedCode:       "not_found",
			expectedStatusCode: http.StatusNotFound,
			expectedMessage:    "model 'gpt-4' not found or is not available",
		},
		{
			name:               "service unavailable error",
			lsErr:              llamastack.NewConnectionError("http://localhost:8080", "connection refused"),
			statusCode:         http.StatusServiceUnavailable,
			expectedCode:       "service_unavailable",
			expectedStatusCode: http.StatusServiceUnavailable,
			expectedMessage:    "connection refused",
		},
		{
			name:               "bad gateway error",
			lsErr:              llamastack.NewInvalidResponseError("http://localhost:8080", "invalid JSON"),
			statusCode:         http.StatusBadGateway,
			expectedCode:       "bad_gateway",
			expectedStatusCode: http.StatusBadGateway,
			expectedMessage:    "invalid JSON",
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

func TestMapLlamaStackAPIErrorToHTTPError(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{Level: slog.LevelDebug}))
	app := &App{
		logger: logger,
	}

	params := llamastack.CreateResponseParams{
		Model: "test-model",
		Input: "test input",
	}

	testCases := []struct {
		name               string
		apiErr             *openai.Error
		statusCode         int
		expectedCode       string
		expectedStatusCode int
		expectedMessage    string
	}{
		{
			name: "not found error",
			apiErr: &openai.Error{
				Code:    "model_not_found",
				Message: "Model does not exist",
				Type:    "invalid_request_error",
			},
			statusCode:         http.StatusNotFound,
			expectedCode:       "not_found",
			expectedStatusCode: http.StatusNotFound,
			expectedMessage:    "model 'test-model' not found or is not available",
		},
		{
			name: "unauthorized error",
			apiErr: &openai.Error{
				Code:    "invalid_api_key",
				Message: "Invalid API key provided",
				Type:    "invalid_request_error",
			},
			statusCode:         http.StatusUnauthorized,
			expectedCode:       "unauthorized",
			expectedStatusCode: http.StatusUnauthorized,
			expectedMessage:    "Invalid API key provided",
		},
		{
			name: "bad request error",
			apiErr: &openai.Error{
				Code:    "invalid_request",
				Message: "Missing required parameter",
				Type:    "invalid_request_error",
			},
			statusCode:         http.StatusBadRequest,
			expectedCode:       "bad_request",
			expectedStatusCode: http.StatusBadRequest,
			expectedMessage:    "Missing required parameter",
		},
		{
			name: "internal server error",
			apiErr: &openai.Error{
				Code:    "server_error",
				Message: "Internal processing error",
				Type:    "server_error",
			},
			statusCode:         http.StatusInternalServerError,
			expectedCode:       "internal_server_error",
			expectedStatusCode: http.StatusInternalServerError,
			expectedMessage:    "Internal processing error",
		},
		{
			name: "unknown status code",
			apiErr: &openai.Error{
				Code:    "custom_error",
				Message: "Custom error message",
				Type:    "custom_error",
			},
			statusCode:         http.StatusTeapot,
			expectedCode:       "llamastack_error",
			expectedStatusCode: http.StatusTeapot,
			expectedMessage:    "LlamaStack server error (HTTP 418): Custom error message",
		},
		{
			name: "service unavailable error",
			apiErr: &openai.Error{
				Code:    "overloaded",
				Message: "Server is overloaded",
				Type:    "server_error",
			},
			statusCode:         http.StatusServiceUnavailable,
			expectedCode:       "llamastack_error",
			expectedStatusCode: http.StatusServiceUnavailable,
			expectedMessage:    "LlamaStack server error (HTTP 503): Server is overloaded",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			httpError := app.mapLlamaStackAPIErrorToHTTPError(tc.apiErr, tc.statusCode, params)

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

	params := llamastack.CreateResponseParams{
		Model: "gpt-4",
		Input: "Hello world",
	}

	t.Run("should handle LlamaStackError with invalid request code", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/test", nil)
		rr := httptest.NewRecorder()

		lsErr := llamastack.NewInvalidRequestError("input is required")

		app.handleLlamaStackError(rr, req, lsErr, params)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), `"code": "bad_request"`)
		assert.Contains(t, rr.Body.String(), "input is required")
	})

	t.Run("should handle LlamaStackError with model not found", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/test", nil)
		rr := httptest.NewRecorder()

		lsErr := llamastack.NewModelNotFoundError("gpt-4")

		app.handleLlamaStackError(rr, req, lsErr, params)

		assert.Equal(t, http.StatusNotFound, rr.Code)
		assert.Contains(t, rr.Body.String(), `"code": "not_found"`)
		assert.Contains(t, rr.Body.String(), "gpt-4")
	})

	t.Run("should handle complete flow for API not found error", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/test", nil)
		rr := httptest.NewRecorder()

		apiErr := &openai.Error{
			StatusCode: http.StatusNotFound,
			Code:       "model_not_found",
			Message:    "The model does not exist",
			Type:       "invalid_request_error",
		}

		app.handleLlamaStackError(rr, req, apiErr, params)

		assert.Equal(t, http.StatusNotFound, rr.Code)
		assert.Contains(t, rr.Body.String(), `"code": "not_found"`)
		assert.Contains(t, rr.Body.String(), "gpt-4")
	})

	t.Run("should handle complete flow for API unauthorized error", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/test", nil)
		rr := httptest.NewRecorder()

		apiErr := &openai.Error{
			StatusCode: http.StatusUnauthorized,
			Code:       "invalid_api_key",
			Message:    "Incorrect API key provided",
			Type:       "invalid_request_error",
		}

		app.handleLlamaStackError(rr, req, apiErr, params)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
		assert.Contains(t, rr.Body.String(), `"code": "unauthorized"`)
		assert.Contains(t, rr.Body.String(), "Incorrect API key provided")
	})

	t.Run("should handle complete flow for API internal error", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/test", nil)
		rr := httptest.NewRecorder()

		apiErr := &openai.Error{
			StatusCode: http.StatusInternalServerError,
			Code:       "server_error",
			Message:    "The server had an error processing your request",
			Type:       "server_error",
		}

		app.handleLlamaStackError(rr, req, apiErr, params)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
		assert.Contains(t, rr.Body.String(), `"code": "internal_server_error"`)
		assert.Contains(t, rr.Body.String(), "The server had an error processing your request")
	})

	t.Run("should handle openai.Error with zero status code", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/test", nil)
		rr := httptest.NewRecorder()

		apiErr := &openai.Error{
			StatusCode: 0, // No status code
			Code:       "unknown_error",
			Message:    "An unknown error occurred",
			Type:       "unknown_error",
		}

		app.handleLlamaStackError(rr, req, apiErr, params)

		// Should default to 500
		assert.Equal(t, http.StatusInternalServerError, rr.Code)
		assert.Contains(t, rr.Body.String(), `"code": "internal_server_error"`)
		assert.Contains(t, rr.Body.String(), "An unknown error occurred")
	})

	t.Run("should fall back to serverErrorResponse for unknown error type", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/test", nil)
		rr := httptest.NewRecorder()

		regularErr := fmt.Errorf("regular Go error")

		app.handleLlamaStackError(rr, req, regularErr, params)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
		assert.Contains(t, rr.Body.String(), "the server encountered a problem")
	})
}
