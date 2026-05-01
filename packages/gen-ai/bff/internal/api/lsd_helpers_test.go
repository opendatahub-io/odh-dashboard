package api

import (
	"errors"
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
		expectedBodyContains []string
	}{
		{
			name:               "LlamaStackError with InvalidRequest code - input required",
			inputError:         llamastack.NewInvalidRequestError("input is required"),
			expectedStatusCode: http.StatusBadRequest,
			expectedBodyContains: []string{
				`"component": "model"`,
				`"code": "invalid_parameter"`,
				`"retriable": false`,
				`"message": "input is required"`,
			},
		},
		{
			name:               "LlamaStackError with InvalidRequest code - parameter error",
			inputError:         llamastack.NewInvalidRequestError("temperature invalid"),
			expectedStatusCode: http.StatusBadRequest,
			expectedBodyContains: []string{
				`"component": "model"`,
				`"code": "invalid_parameter"`,
				`"message": "temperature invalid"`,
			},
		},
		{
			name:               "LlamaStackError with Unauthorized code",
			inputError:         llamastack.NewUnauthorizedError("invalid token"),
			expectedStatusCode: http.StatusUnauthorized,
			expectedBodyContains: []string{
				`"component": "llama_stack"`,
				`"code": "server_error"`,
				`"retriable": true`,
				`"message": "invalid token"`,
			},
		},
		{
			name:               "LlamaStackError with NotFound code",
			inputError:         llamastack.NewNotFoundError("resource not found"),
			expectedStatusCode: http.StatusNotFound,
			expectedBodyContains: []string{
				`"component": "llama_stack"`,
				`"code": "server_error"`,
				`"message": "resource not found"`,
			},
		},
		{
			name:               "LlamaStackError with ConnectionFailed code",
			inputError:         llamastack.NewConnectionError("connection refused"),
			expectedStatusCode: http.StatusBadGateway,
			expectedBodyContains: []string{
				`"component": "llama_stack"`,
				`"code": "server_error"`,
				`"message": "connection refused"`,
			},
		},
		{
			name:               "Generic error (not LlamaStackError)",
			inputError:         errors.New("generic error message"),
			expectedStatusCode: http.StatusInternalServerError,
			expectedBodyContains: []string{
				"the server encountered a problem",
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			rr := httptest.NewRecorder()
			req := httptest.NewRequest("GET", "/test", nil)

			app.handleLlamaStackClientError(rr, req, tc.inputError)

			assert.Equal(t, tc.expectedStatusCode, rr.Code)

			body := rr.Body.String()
			for _, expected := range tc.expectedBodyContains {
				assert.Contains(t, body, expected)
			}
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

func TestMapLlamaStackClientErrorToFrontendError(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{Level: slog.LevelDebug}))
	app := &App{
		logger: logger,
	}

	testCases := []struct {
		name                    string
		lsErr                   *llamastack.LlamaStackError
		statusCode              int
		expectedComponent       string
		expectedCode            string
		expectedStatusCode      int
		expectedMessageContains string
		expectedRetriable       bool
		expectedToolName        string
	}{
		{
			name:                    "bad request with invalid parameter",
			lsErr:                   llamastack.NewInvalidRequestError("temperature must be between 0.0 and 2.0"),
			statusCode:              http.StatusBadRequest,
			expectedComponent:       "model",
			expectedCode:            "invalid_parameter",
			expectedStatusCode:      http.StatusBadRequest,
			expectedMessageContains: "temperature must be between 0.0 and 2.0",
			expectedRetriable:       false,
		},
		{
			name:                    "bad request with token limit",
			lsErr:                   llamastack.NewLlamaStackErrorWithDetails(llamastack.ErrCodeInvalidRequest, "max_tokens exceeds limit", "invalid_request_error", "invalid_request_error", "", http.StatusBadRequest),
			statusCode:              http.StatusBadRequest,
			expectedComponent:       "model",
			expectedCode:            "invalid_model_config",
			expectedStatusCode:      http.StatusBadRequest,
			expectedMessageContains: "max_tokens exceeds limit",
			expectedRetriable:       false,
		},
		{
			name:                    "unauthorized error",
			lsErr:                   llamastack.NewUnauthorizedError("invalid token"),
			statusCode:              http.StatusUnauthorized,
			expectedComponent:       "llama_stack",
			expectedCode:            "server_error",
			expectedStatusCode:      http.StatusUnauthorized,
			expectedMessageContains: "invalid token",
			expectedRetriable:       true,
		},
		{
			name:                    "not found error",
			lsErr:                   llamastack.NewNotFoundError("resource not found"),
			statusCode:              http.StatusNotFound,
			expectedComponent:       "llama_stack",
			expectedCode:            "server_error",
			expectedStatusCode:      http.StatusNotFound,
			expectedMessageContains: "resource not found",
			expectedRetriable:       true,
		},
		{
			name:                    "connection error",
			lsErr:                   llamastack.NewConnectionError("connection refused"),
			statusCode:              http.StatusBadGateway,
			expectedComponent:       "llama_stack",
			expectedCode:            "server_error",
			expectedStatusCode:      http.StatusBadGateway,
			expectedMessageContains: "connection refused",
			expectedRetriable:       true,
		},
		{
			name:                    "timeout error - overrides to 503",
			lsErr:                   llamastack.NewLlamaStackError(llamastack.ErrCodeTimeout, "request timed out", 504),
			statusCode:              http.StatusGatewayTimeout,
			expectedComponent:       "llama_stack",
			expectedCode:            "timeout",
			expectedStatusCode:      http.StatusServiceUnavailable,
			expectedMessageContains: "request timed out",
			expectedRetriable:       true,
		},
		{
			name:                    "overload error - overrides to 503",
			lsErr:                   llamastack.NewLlamaStackErrorWithDetails(llamastack.ErrCodeInternalError, "model is currently overloaded", "rate_limit_error", "rate_limit_exceeded", "", 429),
			statusCode:              http.StatusTooManyRequests,
			expectedComponent:       "llama_stack",
			expectedCode:            "rate_limit",
			expectedStatusCode:      http.StatusServiceUnavailable,
			expectedMessageContains: "model is currently overloaded",
			expectedRetriable:       true,
		},
		{
			name:                    "RAG vector store not found",
			lsErr:                   llamastack.NewLlamaStackErrorWithDetails(llamastack.ErrCodeInvalidRequest, "vector store 'vs_123' not found", "invalid_request_error", "resource_not_found", "", http.StatusBadRequest),
			statusCode:              http.StatusBadRequest,
			expectedComponent:       "rag",
			expectedCode:            "not_found",
			expectedStatusCode:      http.StatusBadRequest,
			expectedMessageContains: "vector store 'vs_123' not found",
			expectedRetriable:       false,
		},
		{
			name:                    "guardrails violation",
			lsErr:                   llamastack.NewLlamaStackErrorWithDetails("CUSTOM_ERROR", "content blocked by guardrails", "", "content_policy_violation", "", 400),
			statusCode:              http.StatusBadRequest,
			expectedComponent:       "guardrails",
			expectedCode:            "content_blocked",
			expectedStatusCode:      http.StatusBadRequest,
			expectedMessageContains: "content blocked by guardrails",
			expectedRetriable:       false,
		},
		{
			name:                    "MCP tool error with tool name",
			lsErr:                   llamastack.NewLlamaStackErrorWithDetails(llamastack.ErrCodeInternalError, "tool invocation failed", "tool_error", "tool_error", "github-search", 500),
			statusCode:              http.StatusInternalServerError,
			expectedComponent:       "mcp",
			expectedCode:            "unreachable",
			expectedStatusCode:      http.StatusInternalServerError,
			expectedMessageContains: "tool invocation failed",
			expectedRetriable:       true,
			expectedToolName:        "github-search",
		},
		{
			name:                    "MCP tool not found with tool name",
			lsErr:                   llamastack.NewLlamaStackErrorWithDetails(llamastack.ErrCodeInvalidRequest, "tool not found", "invalid_request_error", "tool_not_found", "weather-api", 400),
			statusCode:              http.StatusBadRequest,
			expectedComponent:       "mcp",
			expectedCode:            "unreachable",
			expectedStatusCode:      http.StatusBadRequest,
			expectedMessageContains: "tool not found",
			expectedRetriable:       true,
			expectedToolName:        "weather-api",
		},
		{
			name:                    "MCP error without tool name",
			lsErr:                   llamastack.NewLlamaStackErrorWithDetails(llamastack.ErrCodeInternalError, "mcp server error", "mcp_error", "mcp_error", "", 500),
			statusCode:              http.StatusInternalServerError,
			expectedComponent:       "mcp",
			expectedCode:            "unreachable",
			expectedStatusCode:      http.StatusInternalServerError,
			expectedMessageContains: "mcp server error",
			expectedRetriable:       true,
			expectedToolName:        "",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			frontendErr := app.mapLlamaStackClientErrorToFrontendError(tc.lsErr, tc.statusCode)

			assert.Equal(t, tc.expectedStatusCode, frontendErr.Status)
			assert.NotNil(t, frontendErr.Error)
			assert.Equal(t, tc.expectedComponent, frontendErr.Error.Component)
			assert.Equal(t, tc.expectedCode, frontendErr.Error.Code)
			assert.Contains(t, frontendErr.Error.Message, tc.expectedMessageContains)
			assert.Equal(t, tc.expectedRetriable, frontendErr.Error.Retriable)

			// For MCP errors, verify tool name is populated from Param field
			if tc.expectedComponent == "mcp" {
				assert.Equal(t, tc.expectedToolName, frontendErr.Error.ToolName)
			}
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
		body := rr.Body.String()

		// "input is required" should be categorized as invalid_parameter
		assert.Contains(t, body, `"component": "model"`)
		assert.Contains(t, body, `"code": "invalid_parameter"`)
		assert.Contains(t, body, "input is required")
		assert.Contains(t, body, `"retriable": false`)
	})

	t.Run("should handle LlamaStackError with parameter validation error", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/test", nil)
		rr := httptest.NewRecorder()

		lsErr := llamastack.NewInvalidRequestError("temperature out of range")

		app.handleLlamaStackClientError(rr, req, lsErr)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		// Temperature error gets invalid_parameter category
		assert.Contains(t, rr.Body.String(), `"component": "model"`)
		assert.Contains(t, rr.Body.String(), `"code": "invalid_parameter"`)
		assert.Contains(t, rr.Body.String(), "temperature out of range")
	})

	t.Run("should handle LlamaStackError with not found", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/test", nil)
		rr := httptest.NewRecorder()

		lsErr := llamastack.NewNotFoundError("resource not found")

		app.handleLlamaStackClientError(rr, req, lsErr)

		assert.Equal(t, http.StatusNotFound, rr.Code)
		assert.Contains(t, rr.Body.String(), `"component": "llama_stack"`)
		assert.Contains(t, rr.Body.String(), `"code": "server_error"`)
		// Not found errors pass through the actual OpenAI message
		assert.Contains(t, rr.Body.String(), "resource not found")
		assert.Contains(t, rr.Body.String(), `"retriable": true`)
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

		lsErr := llamastack.NewLlamaStackErrorWithDetails(llamastack.ErrCodeInvalidRequest, "vector store 'vs_123' not found", "invalid_request_error", "resource_not_found", "", http.StatusBadRequest)

		app.handleLlamaStackClientError(rr, req, lsErr)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), `"component": "rag"`)
		assert.Contains(t, rr.Body.String(), `"code": "not_found"`)
		assert.Contains(t, rr.Body.String(), "vector store")
		assert.Contains(t, rr.Body.String(), `"retriable": false`)
	})

	t.Run("should categorize timeout errors correctly and override to 503", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/test", nil)
		rr := httptest.NewRecorder()

		lsErr := llamastack.NewLlamaStackErrorWithDetails(llamastack.ErrCodeInternalError, "request timed out", "server_error", "timeout", "", 500)

		app.handleLlamaStackClientError(rr, req, lsErr)

		assert.Equal(t, http.StatusServiceUnavailable, rr.Code)
		assert.Contains(t, rr.Body.String(), `"component": "llama_stack"`)
		assert.Contains(t, rr.Body.String(), `"code": "timeout"`)
		assert.Contains(t, rr.Body.String(), "timed out")
		assert.Contains(t, rr.Body.String(), `"retriable": true`)
	})
}
