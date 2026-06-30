package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/openai/openai-go/v2"
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
				`"component": "bff"`,
				`"code": "INVALID_REQUEST"`,
				`"retriable": false`,
				`"message": "input is required"`,
			},
		},
		{
			name:               "LlamaStackError with InvalidRequest code - parameter error",
			inputError:         llamastack.NewInvalidRequestError("temperature invalid"),
			expectedStatusCode: http.StatusBadRequest,
			expectedBodyContains: []string{
				`"component": "bff"`,
				`"code": "INVALID_REQUEST"`,
				`"message": "temperature invalid"`,
			},
		},
		{
			name:               "LlamaStackError with Unauthorized code",
			inputError:         llamastack.NewUnauthorizedError("invalid token"),
			expectedStatusCode: http.StatusUnauthorized,
			expectedBodyContains: []string{
				`"component": "bff"`,
				`"code": "UNAUTHORIZED"`,
				`"retriable": false`,
				`"message": "invalid token"`,
			},
		},
		{
			name:               "LlamaStackError with NotFound code",
			inputError:         llamastack.NewNotFoundError("resource not found"),
			expectedStatusCode: http.StatusNotFound,
			expectedBodyContains: []string{
				`"component": "bff"`,
				`"code": "NOT_FOUND"`,
				`"message": "resource not found"`,
			},
		},
		{
			name:               "LlamaStackError with ConnectionFailed code",
			inputError:         llamastack.NewConnectionError("connection refused"),
			expectedStatusCode: http.StatusBadGateway,
			expectedBodyContains: []string{
				`"component": "ogx"`,
				`"code": "CONNECTION_FAILED"`,
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
	}{
		{
			name:                    "bad request with invalid parameter",
			lsErr:                   llamastack.NewInvalidRequestError("temperature must be between 0.0 and 2.0"),
			statusCode:              http.StatusBadRequest,
			expectedComponent:       llamastack.ComponentBFF,
			expectedCode:            "INVALID_REQUEST",
			expectedStatusCode:      http.StatusBadRequest,
			expectedMessageContains: "temperature must be between 0.0 and 2.0",
			expectedRetriable:       false,
		},
		{
			name:                    "unauthorized error",
			lsErr:                   llamastack.NewUnauthorizedError("invalid token"),
			statusCode:              http.StatusUnauthorized,
			expectedComponent:       llamastack.ComponentBFF,
			expectedCode:            "UNAUTHORIZED",
			expectedStatusCode:      http.StatusUnauthorized,
			expectedMessageContains: "invalid token",
			expectedRetriable:       false,
		},
		{
			name:                    "not found error",
			lsErr:                   llamastack.NewNotFoundError("resource not found"),
			statusCode:              http.StatusNotFound,
			expectedComponent:       llamastack.ComponentBFF,
			expectedCode:            "NOT_FOUND",
			expectedStatusCode:      http.StatusNotFound,
			expectedMessageContains: "resource not found",
			expectedRetriable:       false,
		},
		{
			name:                    "connection error",
			lsErr:                   llamastack.NewConnectionError("connection refused"),
			statusCode:              http.StatusBadGateway,
			expectedComponent:       llamastack.ComponentOGX,
			expectedCode:            "CONNECTION_FAILED",
			expectedStatusCode:      http.StatusBadGateway,
			expectedMessageContains: "connection refused",
			expectedRetriable:       true,
		},
		{
			name: "timeout error - keeps 504",
			lsErr: func() *llamastack.LlamaStackError {
				e := llamastack.NewLlamaStackError(llamastack.ErrCodeTimeout, "request timed out", 504)
				e.Component = llamastack.ComponentOGX
				return e
			}(),
			statusCode:              http.StatusGatewayTimeout,
			expectedComponent:       llamastack.ComponentOGX,
			expectedCode:            "TIMEOUT",
			expectedStatusCode:      http.StatusGatewayTimeout,
			expectedMessageContains: "request timed out",
			expectedRetriable:       true,
		},
		{
			name:                    "overload error - keeps 429",
			lsErr:                   llamastack.NewLlamaStackErrorWithDetails(llamastack.ErrCodeInternalError, "model is currently overloaded", "rate_limit_error", "rate_limit_exceeded", "", llamastack.ComponentOGX, 429),
			statusCode:              http.StatusTooManyRequests,
			expectedComponent:       llamastack.ComponentOGX,
			expectedCode:            "rate_limit_exceeded",
			expectedStatusCode:      http.StatusTooManyRequests,
			expectedMessageContains: "model is currently overloaded",
			expectedRetriable:       true,
		},
		{
			name:                    "HTTP 429 with generic error code is retriable",
			lsErr:                   llamastack.NewLlamaStackErrorWithDetails(llamastack.ErrCodeInternalError, "too many requests", "server_error", "unknown_error", "", llamastack.ComponentOGX, 429),
			statusCode:              http.StatusTooManyRequests,
			expectedComponent:       llamastack.ComponentOGX,
			expectedCode:            "unknown_error",
			expectedStatusCode:      http.StatusTooManyRequests,
			expectedMessageContains: "too many requests",
			expectedRetriable:       true,
		},
		{
			name:                    "HTTP 500 with generic error code is retriable",
			lsErr:                   llamastack.NewLlamaStackErrorWithDetails(llamastack.ErrCodeInternalError, "internal server error", "server_error", "unknown_error", "", llamastack.ComponentOGX, 500),
			statusCode:              http.StatusInternalServerError,
			expectedComponent:       llamastack.ComponentOGX,
			expectedCode:            "unknown_error",
			expectedStatusCode:      http.StatusInternalServerError,
			expectedMessageContains: "internal server error",
			expectedRetriable:       true,
		},
		{
			name:                    "HTTP 502 with generic error code is retriable",
			lsErr:                   llamastack.NewLlamaStackErrorWithDetails(llamastack.ErrCodeInternalError, "bad gateway", "server_error", "unknown_error", "", llamastack.ComponentOGX, 502),
			statusCode:              http.StatusBadGateway,
			expectedComponent:       llamastack.ComponentOGX,
			expectedCode:            "unknown_error",
			expectedStatusCode:      http.StatusBadGateway,
			expectedMessageContains: "bad gateway",
			expectedRetriable:       true,
		},
		{
			name:                    "HTTP 503 with generic error code is retriable",
			lsErr:                   llamastack.NewLlamaStackErrorWithDetails(llamastack.ErrCodeServerUnavailable, "service unavailable", "server_error", "unknown_error", "", llamastack.ComponentOGX, 503),
			statusCode:              http.StatusServiceUnavailable,
			expectedComponent:       llamastack.ComponentOGX,
			expectedCode:            "unknown_error",
			expectedStatusCode:      http.StatusServiceUnavailable,
			expectedMessageContains: "service unavailable",
			expectedRetriable:       true,
		},
		{
			name:                    "HTTP 504 with generic error code is retriable",
			lsErr:                   llamastack.NewLlamaStackErrorWithDetails(llamastack.ErrCodeInternalError, "gateway timeout", "server_error", "unknown_error", "", llamastack.ComponentOGX, 504),
			statusCode:              http.StatusGatewayTimeout,
			expectedComponent:       llamastack.ComponentOGX,
			expectedCode:            "unknown_error",
			expectedStatusCode:      http.StatusGatewayTimeout,
			expectedMessageContains: "gateway timeout",
			expectedRetriable:       true,
		},
		{
			name:                    "HTTP 400 with generic error code is not retriable",
			lsErr:                   llamastack.NewLlamaStackErrorWithDetails(llamastack.ErrCodeInvalidRequest, "bad request", "invalid_request_error", "unknown_error", "", llamastack.ComponentOGX, 400),
			statusCode:              http.StatusBadRequest,
			expectedComponent:       llamastack.ComponentOGX,
			expectedCode:            "unknown_error",
			expectedStatusCode:      http.StatusBadRequest,
			expectedMessageContains: "bad request",
			expectedRetriable:       false,
		},
		{
			name:                    "HTTP 403 with generic error code is not retriable",
			lsErr:                   llamastack.NewLlamaStackErrorWithDetails(llamastack.ErrCodeInternalError, "forbidden", "server_error", "unknown_error", "", llamastack.ComponentOGX, 403),
			statusCode:              http.StatusForbidden,
			expectedComponent:       llamastack.ComponentOGX,
			expectedCode:            "unknown_error",
			expectedStatusCode:      http.StatusForbidden,
			expectedMessageContains: "forbidden",
			expectedRetriable:       false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			frontendErr := app.mapLlamaStackClientErrorToFrontendError(tc.lsErr, tc.statusCode)

			assert.Equal(t, tc.expectedStatusCode, frontendErr.StatusCode)
			assert.NotNil(t, frontendErr.Error)
			assert.Equal(t, tc.expectedComponent, frontendErr.Error.Component)
			assert.Equal(t, tc.expectedCode, frontendErr.Error.Code)
			assert.Contains(t, frontendErr.Error.Message, tc.expectedMessageContains)
			assert.Equal(t, tc.expectedRetriable, frontendErr.Error.Retriable)
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

		assert.Contains(t, body, `"component": "bff"`)
		assert.Contains(t, body, `"code": "INVALID_REQUEST"`)
		assert.Contains(t, body, "input is required")
		assert.Contains(t, body, `"retriable": false`)
	})

	t.Run("should handle LlamaStackError with parameter validation error", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/test", nil)
		rr := httptest.NewRecorder()

		lsErr := llamastack.NewInvalidRequestError("temperature out of range")

		app.handleLlamaStackClientError(rr, req, lsErr)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), `"component": "bff"`)
		assert.Contains(t, rr.Body.String(), `"code": "INVALID_REQUEST"`)
		assert.Contains(t, rr.Body.String(), "temperature out of range")
	})

	t.Run("should handle LlamaStackError with not found", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/test", nil)
		rr := httptest.NewRecorder()

		lsErr := llamastack.NewNotFoundError("resource not found")

		app.handleLlamaStackClientError(rr, req, lsErr)

		assert.Equal(t, http.StatusNotFound, rr.Code)
		assert.Contains(t, rr.Body.String(), `"component": "bff"`)
		assert.Contains(t, rr.Body.String(), `"code": "NOT_FOUND"`)
		assert.Contains(t, rr.Body.String(), "resource not found")
		assert.Contains(t, rr.Body.String(), `"retriable": false`)
	})

	t.Run("should fall back to serverErrorResponse for unknown error type", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/test", nil)
		rr := httptest.NewRecorder()

		regularErr := errors.New("regular Go error")

		app.handleLlamaStackClientError(rr, req, regularErr)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
		assert.Contains(t, rr.Body.String(), "the server encountered a problem")
	})

	t.Run("should categorize timeout errors correctly and keep 500", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/test", nil)
		rr := httptest.NewRecorder()

		lsErr := llamastack.NewLlamaStackErrorWithDetails(llamastack.ErrCodeInternalError, "request timed out", "server_error", "timeout", "", llamastack.ComponentOGX, 500)

		app.handleLlamaStackClientError(rr, req, lsErr)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
		assert.Contains(t, rr.Body.String(), `"component": "ogx"`)
		assert.Contains(t, rr.Body.String(), `"code": "timeout"`)
		assert.Contains(t, rr.Body.String(), "timed out")
		assert.Contains(t, rr.Body.String(), `"retriable": true`)
	})
}

func TestBuildStreamingErrorEvent(t *testing.T) {
	testCases := []struct {
		name             string
		code             string
		message          string
		component        string
		retriable        bool
		expectedContains []string
	}{
		{
			name:      "server error from ogx",
			code:      "server_error",
			message:   "An unexpected error occurred",
			component: "ogx",
			retriable: true,
			expectedContains: []string{
				`"code":"server_error"`,
				`"message":"An unexpected error occurred"`,
				`"component":"ogx"`,
				`"retriable":true`,
			},
		},
		{
			name:      "model not found",
			code:      "404",
			message:   "Model 'nonexistent' not found",
			component: "ogx",
			retriable: false,
			expectedContains: []string{
				`"code":"404"`,
				`"message":"Model 'nonexistent' not found"`,
				`"component":"ogx"`,
				`"retriable":false`,
			},
		},
		{
			name:      "guardrail violation",
			code:      "guardrail_output_violation",
			message:   "output blocked by safety guardrails",
			component: "guardrails",
			retriable: false,
			expectedContains: []string{
				`"code":"guardrail_output_violation"`,
				`"component":"guardrails"`,
				`"retriable":false`,
			},
		},
		{
			name:      "MCP tool error",
			code:      "tool_error",
			message:   "tool invocation failed",
			component: "mcp",
			retriable: true,
			expectedContains: []string{
				`"code":"tool_error"`,
				`"component":"mcp"`,
				`"retriable":true`,
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result := buildStreamingErrorEvent(tc.code, tc.message, tc.component, tc.retriable)
			assert.NotNil(t, result)

			resultStr := string(result)
			for _, expected := range tc.expectedContains {
				assert.Contains(t, resultStr, expected)
			}

			// Verify it's valid JSON with the expected top-level structure
			var parsed map[string]interface{}
			err := json.Unmarshal(result, &parsed)
			assert.NoError(t, err)
			assert.Contains(t, parsed, "error")
		})
	}
}

func TestExtractStreamingError(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{Level: slog.LevelDebug}))
	app := &App{
		logger: logger,
	}

	testCases := []struct {
		name              string
		err               error
		expectedMessage   string
		expectedCode      string
		expectedComponent string
		expectedRetriable bool
	}{
		{
			name:              "LlamaStackError with ErrorCode",
			err:               llamastack.NewLlamaStackErrorWithDetails(llamastack.ErrCodeInternalError, "rate limit hit", "rate_limit_error", "rate_limit_exceeded", "", llamastack.ComponentOGX, 429),
			expectedMessage:   "rate limit hit",
			expectedCode:      "rate_limit_exceeded",
			expectedComponent: llamastack.ComponentOGX,
			expectedRetriable: true,
		},
		{
			name:              "LlamaStackError without ErrorCode falls back to Code",
			err:               llamastack.NewConnectionError("connection refused"),
			expectedMessage:   "connection refused",
			expectedCode:      "CONNECTION_FAILED",
			expectedComponent: llamastack.ComponentOGX,
			expectedRetriable: true,
		},
		{
			name:              "generic error",
			err:               errors.New("something went wrong"),
			expectedMessage:   "An error occurred during streaming. Please try again.",
			expectedCode:      "streaming_error",
			expectedComponent: llamastack.ComponentBFF,
			expectedRetriable: false,
		},
		{
			name: "wrapped LlamaStackError",
			err: func() error {
				lsErr := llamastack.NewLlamaStackErrorWithDetails(llamastack.ErrCodeServerUnavailable, "service down", "server_error", "service_unavailable", "", llamastack.ComponentOGX, 503)
				return fmt.Errorf("stream failed: %w", lsErr)
			}(),
			expectedMessage:   "service down",
			expectedCode:      "service_unavailable",
			expectedComponent: llamastack.ComponentOGX,
			expectedRetriable: true,
		},
		{
			name:              "connection refused (url.Error)",
			err:               &url.Error{Op: "Post", URL: "http://localhost:8321/v1/responses", Err: fmt.Errorf("connect: connection refused")},
			expectedMessage:   "Failed to connect to LlamaStack server: connect: connection refused",
			expectedCode:      "CONNECTION_FAILED",
			expectedComponent: llamastack.ComponentOGX,
			expectedRetriable: true,
		},
		{
			name:              "OpenAI API error (500)",
			err:               &openai.Error{StatusCode: 500, Message: "internal server error", Code: "server_error"},
			expectedMessage:   "internal server error",
			expectedCode:      "server_error",
			expectedComponent: llamastack.ComponentOGX,
			expectedRetriable: true,
		},
		{
			name:              "OpenAI API error (429 rate limit)",
			err:               &openai.Error{StatusCode: 429, Message: "rate limit exceeded", Code: "rate_limit_exceeded"},
			expectedMessage:   "rate limit exceeded",
			expectedCode:      "rate_limit_exceeded",
			expectedComponent: llamastack.ComponentOGX,
			expectedRetriable: true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			message, code, component, retriable := app.extractStreamingError(tc.err)
			assert.Equal(t, tc.expectedMessage, message)
			assert.Equal(t, tc.expectedCode, code)
			assert.Equal(t, tc.expectedComponent, component)
			assert.Equal(t, tc.expectedRetriable, retriable)
		})
	}
}

func TestIsRetriable(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{Level: slog.LevelDebug}))
	app := &App{
		logger: logger,
	}

	tests := []struct {
		errorCode  string
		statusCode int
		expected   bool
	}{
		// OGX response.failed codes that are retriable
		{llamastack.OGXErrServerError, 0, true},
		{llamastack.OGXErrRateLimitExceeded, 0, true},
		{llamastack.OGXErrVectorStoreTimeout, 0, true},

		// OGX response.failed codes that are NOT retriable
		{llamastack.OGXErrInvalidPrompt, 0, false},
		{llamastack.OGXErrInvalidImage, 0, false},
		{llamastack.OGXErrImageContentPolicyViolation, 0, false},

		// Status-code fallback: 429 and 5xx are retriable
		{"unknown_error", 429, true},
		{"unknown_error", 500, true},
		{"unknown_error", 502, true},
		{"unknown_error", 503, true},
		{"unknown_error", 504, true},

		// Status-code fallback: 4xx (non-429) are NOT retriable
		{"unknown_error", 400, false},
		{"unknown_error", 401, false},
		{"unknown_error", 403, false},
		{"unknown_error", 404, false},
	}

	for _, tt := range tests {
		t.Run(tt.errorCode+"_"+http.StatusText(tt.statusCode), func(t *testing.T) {
			assert.Equal(t, tt.expected, app.isRetriable(tt.errorCode, tt.statusCode))
		})
	}
}
