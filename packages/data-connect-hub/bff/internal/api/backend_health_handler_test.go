package api

import (
	"context"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/data-connect-hub/bff/internal/config"
	"github.com/opendatahub-io/data-connect-hub/bff/internal/constants"
	helper "github.com/opendatahub-io/data-connect-hub/bff/internal/helpers"
	k8s "github.com/opendatahub-io/data-connect-hub/bff/internal/integrations/kubernetes"
	"github.com/stretchr/testify/require"
)

func backendHealthTestApp(cfg config.EnvConfig, apiURL string) *App {
	app := connectionTypeTestApp(cfg)
	app.dataConnectHubAPIURL = helper.NewStringHolder(apiURL)
	return app
}

func backendHealthRequest(t *testing.T, addIdentity bool) (*httptest.ResponseRecorder, *http.Request) {
	t.Helper()
	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/v1/backend-health", nil)
	if addIdentity {
		identity := &k8s.RequestIdentity{UserID: "test-user"}
		request = request.WithContext(
			context.WithValue(request.Context(), constants.RequestIdentityKey, identity),
		)
	}
	return response, request
}

func TestBackendHealthHandlerReturnsNoContentInMockMode(t *testing.T) {
	app := backendHealthTestApp(config.EnvConfig{MockHTTPClient: true}, "")
	response, request := backendHealthRequest(t, true)

	app.BackendHealthHandler(response, request, nil)

	require.Equal(t, http.StatusNoContent, response.Code)
}

func TestBackendHealthHandlerRequiresIdentity(t *testing.T) {
	app := backendHealthTestApp(config.EnvConfig{}, "https://example.com")
	response, request := backendHealthRequest(t, false)

	app.BackendHealthHandler(response, request, nil)

	require.Equal(t, http.StatusBadRequest, response.Code)
}

func TestBackendHealthHandlerChecksUpstreamHealth(t *testing.T) {
	var requestedPath string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestedPath = r.URL.Path
		w.WriteHeader(http.StatusOK)
	}))
	t.Cleanup(server.Close)
	app := backendHealthTestApp(config.EnvConfig{}, server.URL)
	response, request := backendHealthRequest(t, true)

	app.BackendHealthHandler(response, request, nil)

	require.Equal(t, http.StatusNoContent, response.Code)
	require.Equal(t, "/health", requestedPath)
}

func TestBackendHealthHandlerReturnsServiceUnavailableForUnhealthyUpstream(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	t.Cleanup(server.Close)
	app := backendHealthTestApp(config.EnvConfig{}, server.URL)
	response, request := backendHealthRequest(t, true)

	app.BackendHealthHandler(response, request, nil)

	require.Equal(t, http.StatusServiceUnavailable, response.Code)
}

func TestBackendHealthHandlerReturnsServiceUnavailableWithoutUpstreamURL(t *testing.T) {
	app := backendHealthTestApp(config.EnvConfig{}, "")
	app.logger = slog.New(slog.NewTextHandler(io.Discard, nil))
	response, request := backendHealthRequest(t, true)

	app.BackendHealthHandler(response, request, nil)

	require.Equal(t, http.StatusServiceUnavailable, response.Code)
}
