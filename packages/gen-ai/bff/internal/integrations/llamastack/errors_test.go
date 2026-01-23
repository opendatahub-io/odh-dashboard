package llamastack

import (
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"testing"

	"github.com/openai/openai-go/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestWrapClientError_NilError(t *testing.T) {
	t.Run("should return nil when error is nil", func(t *testing.T) {
		result := wrapClientError(nil, "ListModels")
		assert.Nil(t, result)
	})
}

func TestWrapClientError_NetworkErrors(t *testing.T) {
	tests := []struct {
		name         string
		urlErr       *url.Error
		operation    string
		expectedCode string
		expectedMsg  string
	}{
		{
			name: "connection refused",
			urlErr: &url.Error{
				Op:  "Post",
				URL: "http://localhost:8080",
				Err: errors.New("connection refused"),
			},
			operation:    "CreateResponse",
			expectedCode: ErrCodeConnectionFailed,
		},
		{
			name: "timeout error",
			urlErr: &url.Error{
				Op:  "Get",
				URL: "http://llamastack:8080/models",
				Err: errors.New("context deadline exceeded"),
			},
			operation:    "ListModels",
			expectedCode: ErrCodeConnectionFailed,
		},
		{
			name: "DNS error",
			urlErr: &url.Error{
				Op:  "Get",
				URL: "http://invalid-hostname:8080",
				Err: errors.New("no such host"),
			},
			operation:    "GetModel",
			expectedCode: ErrCodeConnectionFailed,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := wrapClientError(tt.urlErr, tt.operation)

			require.NotNil(t, result)
			assert.Equal(t, tt.expectedCode, result.Code)
			assert.Equal(t, 502, result.StatusCode) // Connection errors return 502 Bad Gateway
			assert.Contains(t, result.Message, fmt.Sprintf("failed to connect to LlamaStack server on operation %s", tt.operation))
			assert.Contains(t, result.Message, tt.urlErr.Err.Error())
		})
	}
}

func TestWrapClientError_APIErrors_BadRequest(t *testing.T) {
	t.Run("400 Bad Request should map to INVALID_REQUEST", func(t *testing.T) {
		apiErr := &openai.Error{
			StatusCode: http.StatusBadRequest,
			Message:    "invalid model parameter",
		}

		result := wrapClientError(apiErr, "CreateResponse")

		require.NotNil(t, result)
		assert.Equal(t, ErrCodeInvalidRequest, result.Code)
		assert.Equal(t, 400, result.StatusCode)
		assert.Contains(t, result.Message, "LlamaStack error on operation CreateResponse")
		assert.Contains(t, result.Message, "invalid model parameter")
	})
}

func TestWrapClientError_APIErrors_Unauthorized(t *testing.T) {
	t.Run("401 Unauthorized should map to UNAUTHORIZED", func(t *testing.T) {
		apiErr := &openai.Error{
			StatusCode: http.StatusUnauthorized,
			Message:    "invalid API key",
		}

		result := wrapClientError(apiErr, "ListModels")

		require.NotNil(t, result)
		assert.Equal(t, ErrCodeUnauthorized, result.Code)
		assert.Equal(t, 401, result.StatusCode)
		assert.Contains(t, result.Message, "LlamaStack error on operation ListModels")
		assert.Contains(t, result.Message, "invalid API key")
	})
}

func TestWrapClientError_APIErrors_NotFound(t *testing.T) {
	t.Run("404 Not Found should map to NOT_FOUND", func(t *testing.T) {
		apiErr := &openai.Error{
			StatusCode: http.StatusNotFound,
			Message:    "model not found",
		}

		result := wrapClientError(apiErr, "GetModel")

		require.NotNil(t, result)
		assert.Equal(t, ErrCodeNotFound, result.Code)
		assert.Equal(t, 404, result.StatusCode)
		assert.Contains(t, result.Message, "LlamaStack error on operation GetModel")
		assert.Contains(t, result.Message, "model not found")
	})
}

func TestWrapClientError_APIErrors_ServiceUnavailable(t *testing.T) {
	tests := []struct {
		name       string
		statusCode int
		message    string
	}{
		{
			name:       "503 Service Unavailable",
			statusCode: http.StatusServiceUnavailable,
			message:    "service temporarily unavailable",
		},
		{
			name:       "504 Gateway Timeout",
			statusCode: http.StatusGatewayTimeout,
			message:    "gateway timeout",
		},
		{
			name:       "408 Request Timeout",
			statusCode: http.StatusRequestTimeout,
			message:    "request timeout",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			apiErr := &openai.Error{
				StatusCode: tt.statusCode,
				Message:    tt.message,
			}

			result := wrapClientError(apiErr, "CreateResponse")

			require.NotNil(t, result)
			assert.Equal(t, ErrCodeServerUnavailable, result.Code)
			assert.Equal(t, 503, result.StatusCode)
			// NewServerUnavailableError passes the formatted message including operation context
			assert.Contains(t, result.Message, "LlamaStack error on operation CreateResponse")
		})
	}
}

func TestWrapClientError_APIErrors_WithMessage(t *testing.T) {
	t.Run("should use provided Message when available", func(t *testing.T) {
		apiErr := &openai.Error{
			StatusCode: http.StatusBadRequest,
			Message:    "custom error message",
		}

		result := wrapClientError(apiErr, "CreateResponse")

		require.NotNil(t, result)
		assert.Equal(t, ErrCodeInvalidRequest, result.Code)
		assert.Contains(t, result.Message, "LlamaStack error on operation CreateResponse")
		assert.Contains(t, result.Message, "custom error message")
	})
}

func TestWrapClientError_APIErrors_OtherStatusCodes(t *testing.T) {
	tests := []struct {
		name       string
		statusCode int
		message    string
	}{
		{
			name:       "500 Internal Server Error",
			statusCode: http.StatusInternalServerError,
			message:    "internal server error",
		},
		{
			name:       "502 Bad Gateway",
			statusCode: http.StatusBadGateway,
			message:    "bad gateway",
		},
		{
			name:       "429 Too Many Requests",
			statusCode: http.StatusTooManyRequests,
			message:    "rate limit exceeded",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			apiErr := &openai.Error{
				StatusCode: tt.statusCode,
				Message:    tt.message,
			}

			result := wrapClientError(apiErr, "ListModels")

			require.NotNil(t, result)
			assert.Equal(t, ErrCodeInternalError, result.Code)
			assert.Equal(t, tt.statusCode, result.StatusCode)
			assert.Contains(t, result.Message, "LlamaStack error on operation ListModels")
			assert.Contains(t, result.Message, tt.message)
		})
	}
}

func TestWrapClientError_UnknownErrors(t *testing.T) {
	t.Run("should wrap unknown error types as INTERNAL_ERROR", func(t *testing.T) {
		unknownErr := errors.New("some unexpected error")

		result := wrapClientError(unknownErr, "CreateResponse")

		require.NotNil(t, result)
		assert.Equal(t, ErrCodeInternalError, result.Code)
		assert.Equal(t, 0, result.StatusCode)
		assert.Contains(t, result.Message, "unexpected error on operation CreateResponse")
		assert.Contains(t, result.Message, "some unexpected error")
	})

	t.Run("should wrap custom error types as INTERNAL_ERROR", func(t *testing.T) {
		customErr := fmt.Errorf("custom error: %w", errors.New("wrapped"))

		result := wrapClientError(customErr, "GetModel")

		require.NotNil(t, result)
		assert.Equal(t, ErrCodeInternalError, result.Code)
		assert.Equal(t, 0, result.StatusCode)
		assert.Contains(t, result.Message, "unexpected error on operation GetModel")
	})
}

func TestWrapClientError_OperationContext(t *testing.T) {
	t.Run("should include operation name in all error messages", func(t *testing.T) {
		operations := []string{"ListModels", "CreateResponse", "GetModel", "DeleteModel"}

		for _, operation := range operations {
			t.Run(operation, func(t *testing.T) {
				// Test with API error
				apiErr := &openai.Error{
					StatusCode: http.StatusBadRequest,
					Message:    "test error",
				}

				result := wrapClientError(apiErr, operation)
				require.NotNil(t, result)
				assert.Contains(t, result.Message, fmt.Sprintf("LlamaStack error on operation %s", operation))

				// Test with network error
				urlErr := &url.Error{
					Op:  "Post",
					URL: "http://localhost:8080",
					Err: errors.New("connection refused"),
				}

				result = wrapClientError(urlErr, operation)
				require.NotNil(t, result)
				assert.Contains(t, result.Message, fmt.Sprintf("failed to connect to LlamaStack server on operation %s", operation))

				// Test with unknown error
				unknownErr := errors.New("unknown")
				result = wrapClientError(unknownErr, operation)
				require.NotNil(t, result)
				assert.Contains(t, result.Message, fmt.Sprintf("unexpected error on operation %s", operation))
			})
		}
	})
}

func TestLlamaStackError_Error(t *testing.T) {
	t.Run("should format error message", func(t *testing.T) {
		err := &LlamaStackError{
			Code:    ErrCodeInvalidRequest,
			Message: "invalid parameter",
		}

		expected := "LlamaStack error [INVALID_REQUEST]: invalid parameter"
		assert.Equal(t, expected, err.Error())
	})
}
