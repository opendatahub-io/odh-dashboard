package bffclient

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestBFFClientError_Error(t *testing.T) {
	t.Run("with target", func(t *testing.T) {
		err := NewBFFClientErrorWithTarget(ErrCodeConnectionFailed, "connection refused", BFFTargetMaaS, 503)
		assert.Equal(t, "BFF client error [CONNECTION_FAILED] for target maas: connection refused", err.Error())
	})

	t.Run("without target", func(t *testing.T) {
		err := NewBFFClientError(ErrCodeInternalError, "something went wrong", 500)
		assert.Equal(t, "BFF client error [INTERNAL_ERROR]: something went wrong", err.Error())
	})
}

func TestErrorConstructors(t *testing.T) {
	tests := []struct {
		name       string
		err        *BFFClientError
		wantCode   string
		wantStatus int
		wantTarget BFFTarget
	}{
		{
			name:       "connection error",
			err:        NewConnectionError(BFFTargetMaaS, "connection refused"),
			wantCode:   ErrCodeConnectionFailed,
			wantStatus: 503,
			wantTarget: BFFTargetMaaS,
		},
		{
			name:       "timeout error",
			err:        NewTimeoutError(BFFTargetGenAI),
			wantCode:   ErrCodeTimeout,
			wantStatus: 408,
			wantTarget: BFFTargetGenAI,
		},
		{
			name:       "invalid response error",
			err:        NewInvalidResponseError(BFFTargetModelRegistry, "bad json"),
			wantCode:   ErrCodeInvalidResponse,
			wantStatus: 502,
			wantTarget: BFFTargetModelRegistry,
		},
		{
			name:       "server unavailable error",
			err:        NewServerUnavailableError(BFFTargetMLflow),
			wantCode:   ErrCodeServerUnavailable,
			wantStatus: 503,
			wantTarget: BFFTargetMLflow,
		},
		{
			name:       "unauthorized error",
			err:        NewUnauthorizedError(BFFTargetMaaS, "invalid token"),
			wantCode:   ErrCodeUnauthorized,
			wantStatus: 401,
			wantTarget: BFFTargetMaaS,
		},
		{
			name:       "forbidden error",
			err:        NewForbiddenError(BFFTargetMaaS, "access denied"),
			wantCode:   ErrCodeForbidden,
			wantStatus: 403,
			wantTarget: BFFTargetMaaS,
		},
		{
			name:       "not found error",
			err:        NewNotFoundError(BFFTargetMaaS, "endpoint not found"),
			wantCode:   ErrCodeNotFound,
			wantStatus: 404,
			wantTarget: BFFTargetMaaS,
		},
		{
			name:       "bad request error",
			err:        NewBadRequestError(BFFTargetMaaS, "invalid input"),
			wantCode:   ErrCodeBadRequest,
			wantStatus: 400,
			wantTarget: BFFTargetMaaS,
		},
		{
			name:       "not configured error",
			err:        NewNotConfiguredError(BFFTargetMaaS),
			wantCode:   ErrCodeNotConfigured,
			wantStatus: 503,
			wantTarget: BFFTargetMaaS,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.wantCode, tt.err.Code)
			assert.Equal(t, tt.wantStatus, tt.err.StatusCode)
			assert.Equal(t, tt.wantTarget, tt.err.Target)
			assert.NotEmpty(t, tt.err.Error())
		})
	}
}

func TestBFFClientError_ImplementsErrorInterface(t *testing.T) {
	var err error = NewConnectionError(BFFTargetMaaS, "test")
	assert.NotNil(t, err)
	assert.Contains(t, err.Error(), "CONNECTION_FAILED")
}
