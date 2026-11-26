package api

import (
	"bytes"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/data-connect-hub/bff/internal/config"
	helper "github.com/opendatahub-io/data-connect-hub/bff/internal/helpers"
	"github.com/stretchr/testify/require"
)

func backendHealthTestApp(cfg config.EnvConfig, apiURL string) *App {
	app := connectionTypeTestApp(cfg)
	app.dataConnectHubAPIURL = helper.NewStringHolder(apiURL)
	return app
}

func backendHealthRequest(t *testing.T) (*httptest.ResponseRecorder, *http.Request) {
	t.Helper()
	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, BackendHealthPath, nil)
	return response, request
}

func TestBackendHealthHandlerReturnsNoContentInMockMode(t *testing.T) {
	app := backendHealthTestApp(config.EnvConfig{MockHTTPClient: true}, "")
	response, request := backendHealthRequest(t)

	app.BackendHealthHandler(response, request, nil)

	require.Equal(t, http.StatusNoContent, response.Code)
}

func TestBackendHealthRouteDoesNotRequireAuthentication(t *testing.T) {
	app := backendHealthTestApp(config.EnvConfig{MockHTTPClient: true}, "")
	response, request := backendHealthRequest(t)

	app.Routes().ServeHTTP(response, request)

	require.Equal(t, http.StatusNoContent, response.Code)
	require.Empty(t, request.Header.Get("Authorization"))
}

func TestBackendHealthHandlerChecksUpstreamHealth(t *testing.T) {
	var requestedPath string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestedPath = r.URL.Path
		w.WriteHeader(http.StatusOK)
	}))
	t.Cleanup(server.Close)
	app := backendHealthTestApp(config.EnvConfig{}, server.URL)
	response, request := backendHealthRequest(t)

	app.BackendHealthHandler(response, request, nil)

	require.Equal(t, http.StatusNoContent, response.Code)
	require.Equal(t, "/health", requestedPath)
}

func TestBackendHealthHandlerRejectsUpstreamRedirects(t *testing.T) {
	targetContacted := make(chan struct{}, 1)
	target := httptest.NewServer(http.HandlerFunc(func(_ http.ResponseWriter, _ *http.Request) {
		targetContacted <- struct{}{}
	}))
	t.Cleanup(target.Close)

	redirect := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, target.URL, http.StatusFound)
	}))
	t.Cleanup(redirect.Close)

	app := backendHealthTestApp(config.EnvConfig{}, redirect.URL)
	var logs bytes.Buffer
	app.logger = slog.New(slog.NewTextHandler(&logs, nil))
	response, request := backendHealthRequest(t)

	app.BackendHealthHandler(response, request, nil)

	require.Equal(t, http.StatusServiceUnavailable, response.Code)
	require.Contains(t, logs.String(), "redirects are not allowed")
	select {
	case <-targetContacted:
		t.Fatal("backend health probe contacted the redirect target")
	default:
	}
}

func TestBackendHealthHandlerReturnsServiceUnavailableForUnhealthyUpstream(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	t.Cleanup(server.Close)
	app := backendHealthTestApp(config.EnvConfig{}, server.URL)
	var logs bytes.Buffer
	app.logger = slog.New(slog.NewTextHandler(&logs, nil))
	response, request := backendHealthRequest(t)

	app.BackendHealthHandler(response, request, nil)

	require.Equal(t, http.StatusServiceUnavailable, response.Code)
	require.Contains(t, logs.String(), "upstream health endpoint returned status 500")
}

func TestBackendHealthHandlerReturnsServiceUnavailableWithoutUpstreamURL(t *testing.T) {
	app := backendHealthTestApp(config.EnvConfig{}, "")
	app.logger = slog.New(slog.NewTextHandler(io.Discard, nil))
	response, request := backendHealthRequest(t)

	app.BackendHealthHandler(response, request, nil)

	require.Equal(t, http.StatusServiceUnavailable, response.Code)
}
