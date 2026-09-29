package api

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/data-connect-hub/bff/internal/config"
	"github.com/opendatahub-io/data-connect-hub/bff/internal/constants"
	k8s "github.com/opendatahub-io/data-connect-hub/bff/internal/integrations/kubernetes"
	"github.com/stretchr/testify/require"
)

func connectionTypeTestApp(cfg config.EnvConfig) *App {
	return &App{
		config: cfg,
		logger: slog.New(slog.NewTextHandler(io.Discard, nil)),
	}
}

func TestGetConnectionTypesHandlerReturnsMockTypes(t *testing.T) {
	app := connectionTypeTestApp(config.EnvConfig{MockHTTPClient: true, MockK8Client: true})
	response, request := requestWithIdentity(t, http.MethodGet, "/api/v1/connection-types?namespace=test-project")

	app.GetConnectionTypesHandler(response, request, httprouter.Params{})

	require.Equal(t, http.StatusOK, response.Code)
	var envelope ConnectionTypesEnvelope
	require.NoError(t, json.NewDecoder(response.Body).Decode(&envelope))
	require.Len(t, envelope.Data, 2)
	require.Equal(t, "PostgreSQL", envelope.Data[0].Resource.Name)
	require.Equal(t, "test-project", envelope.Data[0].Metadata.TenantID)
}

func TestGetConnectionTypeHandlerReturnsMockType(t *testing.T) {
	app := connectionTypeTestApp(config.EnvConfig{MockHTTPClient: true, MockK8Client: true})
	response, request := requestWithIdentity(t, http.MethodGet, "/api/v1/connection-types/postgresql?namespace=test-project")

	app.GetConnectionTypeHandler(response, request, httprouter.Params{{Key: "connection_type_id", Value: "postgresql"}})

	require.Equal(t, http.StatusOK, response.Code)
	var envelope ConnectionTypeEnvelope
	require.NoError(t, json.NewDecoder(response.Body).Decode(&envelope))
	require.Equal(t, "postgresql", envelope.Data.Metadata.ID)
	require.Equal(t, "test-project", envelope.Data.Metadata.TenantID)
	require.Equal(t, "PostgreSQL", envelope.Data.Resource.Name)
}

func TestGetConnectionTypeHandlerReturnsNotFoundForUnknownMockType(t *testing.T) {
	app := connectionTypeTestApp(config.EnvConfig{MockHTTPClient: true, MockK8Client: true})
	response, request := requestWithIdentity(t, http.MethodGet, "/api/v1/connection-types/unknown?namespace=test-project")

	app.GetConnectionTypeHandler(response, request, httprouter.Params{{Key: "connection_type_id", Value: "unknown"}})

	require.Equal(t, http.StatusNotFound, response.Code)
}

func TestGetConnectionTypeHandlerValidatesRequest(t *testing.T) {
	tests := []struct {
		name        string
		path        string
		params      httprouter.Params
		addIdentity bool
	}{
		{
			name:        "missing namespace",
			path:        "/api/v1/connection-types/postgresql",
			params:      httprouter.Params{{Key: "connection_type_id", Value: "postgresql"}},
			addIdentity: true,
		},
		{
			name:        "invalid namespace",
			path:        "/api/v1/connection-types/postgresql?namespace=Not_Valid",
			params:      httprouter.Params{{Key: "connection_type_id", Value: "postgresql"}},
			addIdentity: true,
		},
		{
			name:   "missing identity",
			path:   "/api/v1/connection-types/postgresql?namespace=test-project",
			params: httprouter.Params{{Key: "connection_type_id", Value: "postgresql"}},
		},
		{
			name:        "missing connection type id",
			path:        "/api/v1/connection-types/?namespace=test-project",
			addIdentity: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			app := connectionTypeTestApp(config.EnvConfig{MockHTTPClient: true, MockK8Client: true})
			request := httptest.NewRequest(http.MethodGet, tt.path, nil)
			if tt.addIdentity {
				identity := &k8s.RequestIdentity{UserID: "test-user", Token: "test-token"}
				request = request.WithContext(context.WithValue(request.Context(), constants.RequestIdentityKey, identity))
			}
			response := httptest.NewRecorder()

			app.GetConnectionTypeHandler(response, request, tt.params)

			require.Equal(t, http.StatusBadRequest, response.Code)
		})
	}
}

func TestGetConnectionTypeHandlerForwardsUpstreamRequest(t *testing.T) {
	var requestedPath string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestedPath = r.URL.EscapedPath()
		require.Equal(t, "Bearer test-token", r.Header.Get("Authorization"))
		require.Equal(t, "test-project", r.Header.Get("X-Tenant-ID"))
		require.Equal(t, "test-user", r.Header.Get("X-Remote-User"))
		w.Header().Set("Content-Type", "application/json")
		_, err := w.Write([]byte(`{
			"metadata":{"id":"provider/type one","tenant_id":"test-project","created_at":"2026-09-08T16:00:00Z","updated_at":"2026-09-09T16:00:00Z"},
			"resource":{"name":"Provider type","provider":"provider","credentials_fields":[]},
			"status":{"capabilities":{"flight":false,"rest":true}}
		}`))
		require.NoError(t, err)
	}))
	t.Cleanup(server.Close)
	app := connectionTypeTestApp(config.EnvConfig{
		MockK8Client:         true,
		DataConnectHubAPIURL: server.URL,
	})
	response, request := requestWithIdentity(t, http.MethodGet, "/api/v1/connection-types/provider%2Ftype%20one?namespace=test-project")

	app.GetConnectionTypeHandler(response, request, httprouter.Params{{Key: "connection_type_id", Value: "provider/type one"}})

	require.Equal(t, http.StatusOK, response.Code)
	require.Equal(t, "/api/v1alpha1/data/connection-types/provider%2Ftype%20one", requestedPath)
	var envelope ConnectionTypeEnvelope
	require.NoError(t, json.NewDecoder(response.Body).Decode(&envelope))
	require.Equal(t, "provider/type one", envelope.Data.Metadata.ID)
}

func TestGetConnectionTypeHandlerHandlesInvalidUpstreamResponse(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, err := w.Write([]byte(`{"metadata":`))
		require.NoError(t, err)
	}))
	t.Cleanup(server.Close)
	app := connectionTypeTestApp(config.EnvConfig{MockK8Client: true, DataConnectHubAPIURL: server.URL})
	response, request := requestWithIdentity(t, http.MethodGet, "/api/v1/connection-types/postgresql?namespace=test-project")

	app.GetConnectionTypeHandler(response, request, httprouter.Params{{Key: "connection_type_id", Value: "postgresql"}})

	require.Equal(t, http.StatusInternalServerError, response.Code)
}

func TestGetConnectionTypeHandlerPreservesUpstreamError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNotFound)
		_, err := w.Write([]byte(`{"code":"connection_type_not_found","message":"connection type does not exist"}`))
		require.NoError(t, err)
	}))
	t.Cleanup(server.Close)
	app := connectionTypeTestApp(config.EnvConfig{MockK8Client: true, DataConnectHubAPIURL: server.URL})
	response, request := requestWithIdentity(t, http.MethodGet, "/api/v1/connection-types/missing?namespace=test-project")

	app.GetConnectionTypeHandler(response, request, httprouter.Params{{Key: "connection_type_id", Value: "missing"}})

	require.Equal(t, http.StatusNotFound, response.Code)
	var responseError HTTPError
	require.NoError(t, json.NewDecoder(response.Body).Decode(&responseError))
	require.Equal(t, "connection_type_not_found", responseError.Error.Code)
	require.Equal(t, "connection type does not exist", responseError.Error.Message)
}
