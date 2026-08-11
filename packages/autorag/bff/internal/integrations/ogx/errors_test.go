package ogx

import (
	"errors"
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestOGXError_Error(t *testing.T) {
	err := &OGXError{Code: ErrCodeNotFound, Message: "widget not found"}
	assert.Equal(t, "Open GenAI Stack error [NOT_FOUND]: widget not found", err.Error())
}

func TestNewOGXError_Constructors(t *testing.T) {
	tests := []struct {
		name           string
		build          func(message string) *OGXError
		wantCode       string
		wantStatusCode int
	}{
		{"NewConnectionError", NewConnectionError, ErrCodeConnectionFailed, http.StatusBadGateway},
		{"NewServerUnavailableError", NewServerUnavailableError, ErrCodeServerUnavailable, http.StatusServiceUnavailable},
		{"NewUnauthorizedError", NewUnauthorizedError, ErrCodeUnauthorized, http.StatusUnauthorized},
		{"NewInvalidRequestError", NewInvalidRequestError, ErrCodeInvalidRequest, http.StatusBadRequest},
		{"NewNotFoundError", NewNotFoundError, ErrCodeNotFound, http.StatusNotFound},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.build("boom")
			assert.Equal(t, tt.wantCode, err.Code)
			assert.Equal(t, tt.wantStatusCode, err.StatusCode)
			assert.Equal(t, "boom", err.Message)
		})
	}
}

func TestWrapClientError(t *testing.T) {
	t.Run("nil error returns nil", func(t *testing.T) {
		assert.Nil(t, wrapClientError(nil, "ListModels"))
	})

	t.Run("network-level url.Error maps to a connection error", func(t *testing.T) {
		// Port 1 is a reserved/unassigned port, so this reliably produces a
		// connection-refused error wrapped in a *url.Error by http.Client.Do.
		req, err := http.NewRequest(http.MethodGet, "http://127.0.0.1:1/v1/models", nil)
		assert.NoError(t, err)

		_, doErr := (&http.Client{}).Do(req)
		assert.Error(t, doErr)

		wrapped := wrapClientError(doErr, "ListModels")
		assert.Equal(t, ErrCodeConnectionFailed, wrapped.Code)
		assert.Equal(t, http.StatusBadGateway, wrapped.StatusCode)
		assert.Contains(t, wrapped.Message, "ListModels")
	})

	t.Run("non-url.Error falls back to an internal error", func(t *testing.T) {
		// wrapClientError is documented to handle url.Error specially; any other
		// error type (e.g. one manufactured directly, not from an HTTP round trip)
		// must fall through to the generic internal-error branch rather than being
		// silently misclassified as a connection failure.
		plain := errors.New("boom")

		wrapped := wrapClientError(plain, "ListProviders")

		assert.Equal(t, ErrCodeInternalError, wrapped.Code)
		assert.Equal(t, http.StatusInternalServerError, wrapped.StatusCode)
		assert.Contains(t, wrapped.Message, "ListProviders")
		assert.Contains(t, wrapped.Message, "boom")
	})
}

func TestMapHTTPStatusToError(t *testing.T) {
	tests := []struct {
		name           string
		statusCode     int
		wantCode       string
		wantStatusCode int
	}{
		{"bad request", http.StatusBadRequest, ErrCodeInvalidRequest, http.StatusBadRequest},
		{"unauthorized", http.StatusUnauthorized, ErrCodeUnauthorized, http.StatusUnauthorized},
		{"not found", http.StatusNotFound, ErrCodeNotFound, http.StatusNotFound},
		{"request timeout", http.StatusRequestTimeout, ErrCodeTimeout, http.StatusRequestTimeout},
		{"gateway timeout", http.StatusGatewayTimeout, ErrCodeTimeout, http.StatusGatewayTimeout},
		{"service unavailable", http.StatusServiceUnavailable, ErrCodeServerUnavailable, http.StatusServiceUnavailable},
		{"unmapped status falls back to internal error", http.StatusTeapot, ErrCodeInternalError, http.StatusTeapot},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := mapHTTPStatusToError(tt.statusCode, []byte(`{"error":"boom"}`), "models")

			assert.Equal(t, tt.wantCode, err.Code)
			assert.Equal(t, tt.wantStatusCode, err.StatusCode)
			assert.NotContains(t, err.Message, "boom", "raw upstream body must never be echoed into the error message")
		})
	}
}
