package api

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/data-connect-hub/bff/internal/config"
	"github.com/opendatahub-io/data-connect-hub/bff/internal/repositories"
	"github.com/stretchr/testify/require"
)

func TestConnectionNameAvailabilityHandlerReportsConnectionAndSecretConflicts(t *testing.T) {
	app := &App{
		config: config.EnvConfig{MockHTTPClient: true, MockK8Client: true},
		kubernetesClientFactory: &authorizationTestFactory{
			client: &authorizationTestClient{allowed: true, secretExists: true},
		},
		repositories: repositories.NewRepositories(),
	}
	response, request := requestWithIdentity(
		t,
		http.MethodGet,
		"/api/v1/connection-name-availability?namespace=test-project&name=warehouse",
	)

	app.ConnectionNameAvailabilityHandler(response, request, httprouter.Params{})

	require.Equal(t, http.StatusOK, response.Code)
	body, err := io.ReadAll(response.Body)
	require.NoError(t, err)
	var envelope ConnectionNameAvailabilityEnvelope
	require.NoError(t, json.Unmarshal(body, &envelope))
	require.False(t, envelope.Data.Available)
	require.Equal(t, []string{"connection", "secret"}, envelope.Data.ConflictsWith)
}

func TestConnectionNameAvailabilityHandlerChecksUpstreamConnections(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, err := w.Write([]byte(`{"items":[{
			"metadata":{"id":"550e8400-e29b-41d4-a716-446655440001"},
			"resource":{"name":"warehouse","data_connection_type_id":"550e8400-e29b-41d4-a716-446655440003","format":"tabular","credentials_ref":{"secret":"warehouse"}},
			"status":{"state":"ready"}
		}]}`))
		require.NoError(t, err)
	}))
	defer upstream.Close()

	app := &App{
		config:                  config.EnvConfig{DataConnectHubAPIURL: upstream.URL},
		logger:                  slog.Default(),
		kubernetesClientFactory: &authorizationTestFactory{client: &authorizationTestClient{allowed: true}},
		repositories:            repositories.NewRepositories(),
	}
	response, request := requestWithIdentity(
		t,
		http.MethodGet,
		"/api/v1/connection-name-availability?namespace=test-project&name=warehouse",
	)

	app.ConnectionNameAvailabilityHandler(response, request, httprouter.Params{})

	require.Equal(t, http.StatusOK, response.Code)
	body, err := io.ReadAll(response.Body)
	require.NoError(t, err)
	var envelope ConnectionNameAvailabilityEnvelope
	require.NoError(t, json.Unmarshal(body, &envelope))
	require.False(t, envelope.Data.Available)
	require.Equal(t, []string{"connection"}, envelope.Data.ConflictsWith)
}

func TestConnectionNameAvailabilityHandlerReturnsAvailable(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, err := w.Write([]byte(`{"items":[]}`))
		require.NoError(t, err)
	}))
	defer upstream.Close()

	app := &App{
		config:                  config.EnvConfig{DataConnectHubAPIURL: upstream.URL},
		logger:                  slog.Default(),
		kubernetesClientFactory: &authorizationTestFactory{client: &authorizationTestClient{allowed: true}},
		repositories:            repositories.NewRepositories(),
	}
	response, request := requestWithIdentity(
		t,
		http.MethodGet,
		"/api/v1/connection-name-availability?namespace=test-project&name=warehouse",
	)

	app.ConnectionNameAvailabilityHandler(response, request, httprouter.Params{})

	require.Equal(t, http.StatusOK, response.Code)
	body, err := io.ReadAll(response.Body)
	require.NoError(t, err)
	var envelope ConnectionNameAvailabilityEnvelope
	require.NoError(t, json.Unmarshal(body, &envelope))
	require.True(t, envelope.Data.Available)
	require.Empty(t, envelope.Data.ConflictsWith)
}
