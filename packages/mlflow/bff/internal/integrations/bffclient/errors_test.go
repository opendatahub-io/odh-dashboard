package bffclient

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestBFFClientError_Error(t *testing.T) {
	t.Run("WithTarget", func(t *testing.T) {
		err := &BFFClientError{
			Code:    ErrCodeConnectionFailed,
			Message: "connection refused",
			Target:  BFFTargetModelRegistry,
		}

		errorMsg := err.Error()
		assert.Contains(t, errorMsg, "CONNECTION_FAILED")
		assert.Contains(t, errorMsg, "model-registry")
		assert.Contains(t, errorMsg, "connection refused")
	})

	t.Run("WithoutTarget", func(t *testing.T) {
		err := &BFFClientError{
			Code:    ErrCodeInternalError,
			Message: "internal error",
		}

		errorMsg := err.Error()
		assert.Contains(t, errorMsg, "INTERNAL_ERROR")
		assert.Contains(t, errorMsg, "internal error")
		assert.NotContains(t, errorMsg, "target")
	})
}

func TestNewBFFClientError(t *testing.T) {
	err := NewBFFClientError(ErrCodeTimeout, "request timed out", 408)

	assert.Equal(t, ErrCodeTimeout, err.Code)
	assert.Equal(t, "request timed out", err.Message)
	assert.Equal(t, 408, err.StatusCode)
	assert.Empty(t, err.Target)
}

func TestNewBFFClientErrorWithTarget(t *testing.T) {
	err := NewBFFClientErrorWithTarget(ErrCodeUnauthorized, "invalid token", BFFTargetModelRegistry, 401)

	assert.Equal(t, ErrCodeUnauthorized, err.Code)
	assert.Equal(t, "invalid token", err.Message)
	assert.Equal(t, BFFTargetModelRegistry, err.Target)
	assert.Equal(t, 401, err.StatusCode)
}

func TestErrorConstructors(t *testing.T) {
	tests := []struct {
		name         string
		constructor  func() *BFFClientError
		expectedCode string
		expectedHTTP int
	}{
		{
			name:         "ConnectionError",
			constructor:  func() *BFFClientError { return NewConnectionError(BFFTargetModelRegistry, "failed to connect") },
			expectedCode: ErrCodeConnectionFailed,
			expectedHTTP: 503,
		},
		{
			name:         "TimeoutError",
			constructor:  func() *BFFClientError { return NewTimeoutError(BFFTargetModelRegistry) },
			expectedCode: ErrCodeTimeout,
			expectedHTTP: 408,
		},
		{
			name:         "InvalidResponseError",
			constructor:  func() *BFFClientError { return NewInvalidResponseError(BFFTargetModelRegistry, "invalid JSON") },
			expectedCode: ErrCodeInvalidResponse,
			expectedHTTP: 502,
		},
		{
			name:         "ServerUnavailableError",
			constructor:  func() *BFFClientError { return NewServerUnavailableError(BFFTargetModelRegistry) },
			expectedCode: ErrCodeServerUnavailable,
			expectedHTTP: 503,
		},
		{
			name:         "UnauthorizedError",
			constructor:  func() *BFFClientError { return NewUnauthorizedError(BFFTargetModelRegistry, "token expired") },
			expectedCode: ErrCodeUnauthorized,
			expectedHTTP: 401,
		},
		{
			name:         "ForbiddenError",
			constructor:  func() *BFFClientError { return NewForbiddenError(BFFTargetModelRegistry, "access denied") },
			expectedCode: ErrCodeForbidden,
			expectedHTTP: 403,
		},
		{
			name:         "NotFoundError",
			constructor:  func() *BFFClientError { return NewNotFoundError(BFFTargetModelRegistry, "resource not found") },
			expectedCode: ErrCodeNotFound,
			expectedHTTP: 404,
		},
		{
			name:         "BadRequestError",
			constructor:  func() *BFFClientError { return NewBadRequestError(BFFTargetModelRegistry, "invalid input") },
			expectedCode: ErrCodeBadRequest,
			expectedHTTP: 400,
		},
		{
			name:         "NotConfiguredError",
			constructor:  func() *BFFClientError { return NewNotConfiguredError(BFFTargetModelRegistry) },
			expectedCode: ErrCodeNotConfigured,
			expectedHTTP: 503,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.constructor()
			assert.Equal(t, tt.expectedCode, err.Code)
			assert.Equal(t, tt.expectedHTTP, err.StatusCode)
			assert.Equal(t, BFFTargetModelRegistry, err.Target)
		})
	}
}
