package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	sdkmlflow "github.com/opendatahub-io/mlflow-go/mlflow"
	mlflowpkg "github.com/opendatahub-io/mlflow/bff/internal/integrations/mlflow"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHandleMLflowClientErrorNotConfigured(t *testing.T) {
	app := newTestAppWithRepos()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/experiments", nil)
	rr := httptest.NewRecorder()

	app.handleMLflowClientError(rr, req, mlflowpkg.ErrMLflowNotConfigured)

	assert.Equal(t, http.StatusServiceUnavailable, rr.Code)
	var errResp HTTPError
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&errResp))
	assert.Equal(t, "service_unavailable", errResp.Error.Code)
	assert.Contains(t, errResp.Error.Message, "MLflow is not configured")
}

func TestHandleMLflowClientErrorAPIErrorUnauthorized(t *testing.T) {
	app := newTestAppWithRepos()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/experiments", nil)
	rr := httptest.NewRecorder()

	apiErr := &sdkmlflow.APIError{StatusCode: http.StatusUnauthorized, Message: "invalid token"}
	app.handleMLflowClientError(rr, req, apiErr)

	assert.Equal(t, http.StatusUnauthorized, rr.Code)
	var errResp HTTPError
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&errResp))
	assert.Equal(t, "unauthorized", errResp.Error.Code)
	assert.Equal(t, "invalid token", errResp.Error.Message)
}

func TestHandleMLflowClientErrorAPIErrorForbidden(t *testing.T) {
	app := newTestAppWithRepos()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/experiments", nil)
	rr := httptest.NewRecorder()

	apiErr := &sdkmlflow.APIError{StatusCode: http.StatusForbidden, Message: "access denied"}
	app.handleMLflowClientError(rr, req, apiErr)

	assert.Equal(t, http.StatusForbidden, rr.Code)
	var errResp HTTPError
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&errResp))
	assert.Equal(t, "forbidden", errResp.Error.Code)
}

func TestHandleMLflowClientErrorAPIErrorNotFound(t *testing.T) {
	app := newTestAppWithRepos()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/experiments", nil)
	rr := httptest.NewRecorder()

	apiErr := &sdkmlflow.APIError{StatusCode: http.StatusNotFound, Message: "experiment not found"}
	app.handleMLflowClientError(rr, req, apiErr)

	assert.Equal(t, http.StatusNotFound, rr.Code)
	var errResp HTTPError
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&errResp))
	assert.Equal(t, "not_found", errResp.Error.Code)
}

func TestHandleMLflowClientErrorAPIErrorBadRequest(t *testing.T) {
	app := newTestAppWithRepos()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/experiments", nil)
	rr := httptest.NewRecorder()

	apiErr := &sdkmlflow.APIError{StatusCode: http.StatusBadRequest, Message: "invalid request"}
	app.handleMLflowClientError(rr, req, apiErr)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	var errResp HTTPError
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&errResp))
	assert.Equal(t, "bad_request", errResp.Error.Code)
}

func TestHandleMLflowClientErrorAPIErrorConflict(t *testing.T) {
	app := newTestAppWithRepos()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/experiments", nil)
	rr := httptest.NewRecorder()

	apiErr := &sdkmlflow.APIError{StatusCode: http.StatusConflict, Message: "already exists"}
	app.handleMLflowClientError(rr, req, apiErr)

	assert.Equal(t, http.StatusConflict, rr.Code)
	var errResp HTTPError
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&errResp))
	assert.Equal(t, "conflict", errResp.Error.Code)
}

func TestHandleMLflowClientErrorAPIErrorServerError(t *testing.T) {
	app := newTestAppWithRepos()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/experiments", nil)
	rr := httptest.NewRecorder()

	apiErr := &sdkmlflow.APIError{StatusCode: http.StatusInternalServerError, Message: "internal error"}
	app.handleMLflowClientError(rr, req, apiErr)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	var errResp HTTPError
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&errResp))
	assert.Equal(t, "service_unavailable", errResp.Error.Code)
	assert.Contains(t, errResp.Error.Message, "MLflow server error")
}

func TestHandleMLflowClientErrorAPIErrorZeroStatusCode(t *testing.T) {
	app := newTestAppWithRepos()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/experiments", nil)
	rr := httptest.NewRecorder()

	apiErr := &sdkmlflow.APIError{StatusCode: 0, Message: "unknown"}
	app.handleMLflowClientError(rr, req, apiErr)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

func TestHandleMLflowClientErrorAPIErrorUnexpectedStatus(t *testing.T) {
	app := newTestAppWithRepos()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/experiments", nil)
	rr := httptest.NewRecorder()

	apiErr := &sdkmlflow.APIError{StatusCode: http.StatusTeapot, Message: "teapot"}
	app.handleMLflowClientError(rr, req, apiErr)

	assert.Equal(t, http.StatusBadGateway, rr.Code)
	var errResp HTTPError
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&errResp))
	assert.Equal(t, "mlflow_error", errResp.Error.Code)
	assert.Contains(t, errResp.Error.Message, "418")
}

func TestHandleMLflowClientErrorURLError(t *testing.T) {
	app := newTestAppWithRepos()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/experiments", nil)
	rr := httptest.NewRecorder()

	urlErr := &url.Error{
		Op:  "Get",
		URL: "https://mlflow.example.com",
		Err: fmt.Errorf("connection refused"),
	}
	app.handleMLflowClientError(rr, req, urlErr)

	assert.Equal(t, http.StatusServiceUnavailable, rr.Code)
	var errResp HTTPError
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&errResp))
	assert.Equal(t, "service_unavailable", errResp.Error.Code)
	assert.Contains(t, errResp.Error.Message, "not reachable")
}

func TestHandleMLflowClientErrorGenericError(t *testing.T) {
	app := newTestAppWithRepos()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/experiments", nil)
	rr := httptest.NewRecorder()

	app.handleMLflowClientError(rr, req, fmt.Errorf("something unexpected"))

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

func TestHandleMLflowClientErrorWrappedNotConfigured(t *testing.T) {
	app := newTestAppWithRepos()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/experiments", nil)
	rr := httptest.NewRecorder()

	app.handleMLflowClientError(rr, req, fmt.Errorf("repo: %w", mlflowpkg.ErrMLflowNotConfigured))

	assert.Equal(t, http.StatusServiceUnavailable, rr.Code)
	var errResp HTTPError
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&errResp))
	assert.Equal(t, "service_unavailable", errResp.Error.Code)
	assert.Contains(t, errResp.Error.Message, "MLflow is not configured")
}

func TestHandleMLflowClientErrorWrappedAPIError(t *testing.T) {
	app := newTestAppWithRepos()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/experiments", nil)
	rr := httptest.NewRecorder()

	apiErr := &sdkmlflow.APIError{StatusCode: http.StatusForbidden, Message: "access denied"}
	app.handleMLflowClientError(rr, req, fmt.Errorf("repo: %w", apiErr))

	assert.Equal(t, http.StatusForbidden, rr.Code)
	var errResp HTTPError
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&errResp))
	assert.Equal(t, "forbidden", errResp.Error.Code)
}

func TestHandleMLflowClientErrorWrappedURLError(t *testing.T) {
	app := newTestAppWithRepos()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/experiments", nil)
	rr := httptest.NewRecorder()

	urlErr := &url.Error{
		Op:  "Get",
		URL: "https://mlflow.example.com",
		Err: fmt.Errorf("connection refused"),
	}
	app.handleMLflowClientError(rr, req, fmt.Errorf("repo: %w", urlErr))

	assert.Equal(t, http.StatusServiceUnavailable, rr.Code)
	var errResp HTTPError
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&errResp))
	assert.Equal(t, "service_unavailable", errResp.Error.Code)
	assert.Contains(t, errResp.Error.Message, "not reachable")
}
