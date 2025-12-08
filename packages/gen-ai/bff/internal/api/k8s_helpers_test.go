package api

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes"
	"github.com/stretchr/testify/assert"
)

func TestHandleK8sClientError(t *testing.T) {
	app := &App{}

	t.Run("should handle K8sError and map to appropriate HTTP response", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/test", nil)
		rr := httptest.NewRecorder()

		k8sErr := kubernetes.NewUnauthorizedError("authentication failed: invalid or expired token")
		app.handleK8sClientError(rr, req, k8sErr)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
		assert.Contains(t, rr.Body.String(), "authentication failed: invalid or expired token")
	})

	t.Run("should fall back to serverErrorResponse for non-K8sError", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/test", nil)
		rr := httptest.NewRecorder()

		regularErr := assert.AnError
		app.handleK8sClientError(rr, req, regularErr)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
		assert.Contains(t, rr.Body.String(), "the server encountered a problem")
	})
}

func TestGetDefaultStatusCodeForK8sError(t *testing.T) {
	app := &App{}

	tests := []struct {
		name           string
		errorCode      string
		expectedStatus int
	}{
		{
			name:           "unauthorized error code",
			errorCode:      kubernetes.ErrCodeUnauthorized,
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name:           "forbidden error code",
			errorCode:      kubernetes.ErrCodeForbidden,
			expectedStatus: http.StatusForbidden,
		},
		{
			name:           "permission denied error code",
			errorCode:      kubernetes.ErrCodePermissionDenied,
			expectedStatus: http.StatusForbidden,
		},
		{
			name:           "not found error code",
			errorCode:      kubernetes.ErrCodeNotFound,
			expectedStatus: http.StatusNotFound,
		},
		{
			name:           "internal error code",
			errorCode:      kubernetes.ErrCodeInternalError,
			expectedStatus: http.StatusInternalServerError,
		},
		{
			name:           "unknown error code",
			errorCode:      "UNKNOWN_ERROR",
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			statusCode := app.getDefaultStatusCodeForK8sError(tt.errorCode)
			assert.Equal(t, tt.expectedStatus, statusCode)
		})
	}
}

func TestMapK8sErrorToHTTPError(t *testing.T) {
	app := &App{}

	t.Run("should map unauthorized error correctly", func(t *testing.T) {
		k8sErr := kubernetes.NewUnauthorizedError("authentication failed: invalid or expired token")
		httpErr := app.mapK8sErrorToHTTPError(k8sErr, http.StatusUnauthorized)

		assert.Equal(t, http.StatusUnauthorized, httpErr.StatusCode)
		assert.Equal(t, "unauthorized", httpErr.ErrorResponse.Code)
		assert.Equal(t, "authentication failed: invalid or expired token", httpErr.ErrorResponse.Message)
	})

	t.Run("should map forbidden error correctly", func(t *testing.T) {
		k8sErr := kubernetes.NewForbiddenError("insufficient permissions")
		httpErr := app.mapK8sErrorToHTTPError(k8sErr, http.StatusForbidden)

		assert.Equal(t, http.StatusForbidden, httpErr.StatusCode)
		assert.Equal(t, "forbidden", httpErr.ErrorResponse.Code)
		assert.Equal(t, "insufficient permissions", httpErr.ErrorResponse.Message)
	})

	t.Run("should map permission denied error correctly", func(t *testing.T) {
		k8sErr := kubernetes.NewPermissionDeniedError("test-namespace", "user does not have permission")
		httpErr := app.mapK8sErrorToHTTPError(k8sErr, http.StatusForbidden)

		assert.Equal(t, http.StatusForbidden, httpErr.StatusCode)
		assert.Equal(t, "forbidden", httpErr.ErrorResponse.Code)
		assert.Equal(t, "user does not have permission", httpErr.ErrorResponse.Message)
	})

	t.Run("should map not found error correctly", func(t *testing.T) {
		k8sErr := kubernetes.NewK8sError(kubernetes.ErrCodeNotFound, "resource not found", http.StatusNotFound)
		httpErr := app.mapK8sErrorToHTTPError(k8sErr, http.StatusNotFound)

		assert.Equal(t, http.StatusNotFound, httpErr.StatusCode)
		assert.Equal(t, "not_found", httpErr.ErrorResponse.Code)
		assert.Equal(t, "resource not found", httpErr.ErrorResponse.Message)
	})

	t.Run("should map internal error correctly", func(t *testing.T) {
		k8sErr := kubernetes.NewK8sErrorWithNamespace(
			kubernetes.ErrCodeInternalError,
			"failed to verify user permissions: some error",
			"test-namespace",
			http.StatusInternalServerError,
		)
		httpErr := app.mapK8sErrorToHTTPError(k8sErr, http.StatusInternalServerError)

		assert.Equal(t, http.StatusInternalServerError, httpErr.StatusCode)
		assert.Equal(t, "internal_server_error", httpErr.ErrorResponse.Code)
		assert.Equal(t, "failed to verify user permissions: some error", httpErr.ErrorResponse.Message)
	})

	t.Run("should handle unknown status codes with default case", func(t *testing.T) {
		k8sErr := kubernetes.NewK8sError("CUSTOM_ERROR", "custom error message", 599)
		httpErr := app.mapK8sErrorToHTTPError(k8sErr, 599)

		assert.Equal(t, 599, httpErr.StatusCode)
		assert.Equal(t, "k8s_error", httpErr.ErrorResponse.Code)
		assert.Contains(t, httpErr.ErrorResponse.Message, "Kubernetes error (HTTP 599)")
		assert.Contains(t, httpErr.ErrorResponse.Message, "custom error message")
	})

	t.Run("should use default status code when K8sError status is 0", func(t *testing.T) {
		k8sErr := kubernetes.NewK8sError(kubernetes.ErrCodeUnauthorized, "test message", 0)
		// When statusCode is 0, handleK8sClientError calls getDefaultStatusCodeForK8sError
		httpErr := app.mapK8sErrorToHTTPError(k8sErr, http.StatusUnauthorized)

		assert.Equal(t, http.StatusUnauthorized, httpErr.StatusCode)
		assert.Equal(t, "unauthorized", httpErr.ErrorResponse.Code)
		assert.Equal(t, "test message", httpErr.ErrorResponse.Message)
	})
}

func TestHandleK8sClientErrorIntegration(t *testing.T) {
	app := &App{}

	t.Run("should handle complete flow for unauthorized error", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/test", nil)
		rr := httptest.NewRecorder()

		k8sErr := kubernetes.NewUnauthorizedError("authentication failed: invalid or expired token")
		app.handleK8sClientError(rr, req, k8sErr)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
		assert.Contains(t, rr.Body.String(), `"code": "unauthorized"`)
		assert.Contains(t, rr.Body.String(), "authentication failed: invalid or expired token")
	})

	t.Run("should handle complete flow for permission denied error", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/test", nil)
		rr := httptest.NewRecorder()

		k8sErr := kubernetes.NewPermissionDeniedError("test-namespace", "insufficient permissions to access services in this namespace")
		app.handleK8sClientError(rr, req, k8sErr)

		assert.Equal(t, http.StatusForbidden, rr.Code)
		assert.Contains(t, rr.Body.String(), `"code": "forbidden"`)
		assert.Contains(t, rr.Body.String(), "insufficient permissions to access services in this namespace")
	})

	t.Run("should handle complete flow for internal error", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/test", nil)
		rr := httptest.NewRecorder()

		k8sErr := kubernetes.NewK8sErrorWithNamespace(
			kubernetes.ErrCodeInternalError,
			"failed to verify user permissions: connection timeout",
			"test-namespace",
			http.StatusInternalServerError,
		)
		app.handleK8sClientError(rr, req, k8sErr)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
		assert.Contains(t, rr.Body.String(), `"code": "internal_server_error"`)
		assert.Contains(t, rr.Body.String(), "failed to verify user permissions: connection timeout")
	})
}
