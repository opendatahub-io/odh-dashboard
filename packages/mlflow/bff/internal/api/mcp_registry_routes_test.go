package api

import (
	"bytes"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/opendatahub-io/mlflow-go/mlflow/mcpregistry"
	"github.com/opendatahub-io/mlflow/bff/internal/config"
	mlflowpkg "github.com/opendatahub-io/mlflow/bff/internal/integrations/mlflow"
	"github.com/opendatahub-io/mlflow/bff/internal/repositories"
	"github.com/stretchr/testify/assert"
	tmock "github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

// newTestAppForRoutes builds an App wired for app.Routes() itself, rather
// than for calling a handler method directly with hand-built
// httprouter.Params. Auth is disabled so Routes() doesn't require a
// kubernetesClientFactory and permission checks are skipped, isolating
// these tests to routing/dispatch: does each HTTP method+path reach the
// handler httprouter.go registers it to, with the "*rest" catch-all split
// into the right params.
func newTestAppForRoutes(factory mlflowpkg.MLflowClientFactory) *App {
	return &App{
		config:              config.EnvConfig{AuthMethod: config.AuthMethodDisabled},
		logger:              testLogger(),
		repositories:        repositories.NewRepositories(),
		mlflowClientFactory: factory,
	}
}

// TestRoutesMCPServerCatchAll exercises app.Routes() through real HTTP
// requests (via httptest.NewServer) for both the MCP catch-all path
// (MCPServerCatchAllPath, "*rest") and the plain servers collection path,
// across all four HTTP methods the catch-all registers. This is a routing
// test, not a handler-behavior test: each case only asserts that the
// request reached the expected SDK client method with the expected
// server/sub-resource identifiers parsed out of the URL, and that the
// response status matches. Handler-level behavior (validation, error
// mapping, response bodies) is covered by the direct handler tests in
// mcp_registry_handler_test.go.
func TestRoutesMCPServerCatchAll(t *testing.T) {
	now := time.Now()

	tests := []struct {
		name       string
		method     string
		path       string
		body       string
		setupMock  func(*mlflowpkg.MockClient)
		wantStatus int
	}{
		{
			name:   "GET servers collection routes to search",
			method: http.MethodGet,
			path:   "/api/v1/mcp-registry/servers?workspace=my-ns",
			setupMock: func(m *mlflowpkg.MockClient) {
				m.On("SearchMCPServers", tmock.Anything, tmock.Anything).
					Return(&mcpregistry.MCPServerList{}, nil)
			},
			wantStatus: http.StatusOK,
		},
		{
			name:   "POST servers collection routes to create",
			method: http.MethodPost,
			path:   "/api/v1/mcp-registry/servers?workspace=my-ns",
			body:   `{"name":"` + testMCPServerName + `"}`,
			setupMock: func(m *mlflowpkg.MockClient) {
				m.On("CreateMCPServer", tmock.Anything, testMCPServerName, tmock.Anything).
					Return(&mcpregistry.MCPServer{Name: testMCPServerName, CreationTimestamp: now, LastUpdatedTimestamp: now}, nil)
			},
			wantStatus: http.StatusCreated,
		},
		{
			name:   "GET catch-all server routes to GetMCPServer",
			method: http.MethodGet,
			path:   "/api/v1/mcp-registry/servers/" + testMCPServerName + "?workspace=my-ns",
			setupMock: func(m *mlflowpkg.MockClient) {
				m.On("GetMCPServer", tmock.Anything, testMCPServerName).
					Return(&mcpregistry.MCPServer{Name: testMCPServerName, CreationTimestamp: now, LastUpdatedTimestamp: now}, nil)
			},
			wantStatus: http.StatusOK,
		},
		{
			name:   "GET catch-all versions sub-resource routes to SearchMCPServerVersions",
			method: http.MethodGet,
			path:   "/api/v1/mcp-registry/servers/" + testMCPServerName + "/versions?workspace=my-ns",
			setupMock: func(m *mlflowpkg.MockClient) {
				m.On("SearchMCPServerVersions", tmock.Anything, testMCPServerName, tmock.Anything).
					Return(&mcpregistry.MCPServerVersionList{}, nil)
			},
			wantStatus: http.StatusOK,
		},
		{
			name:   "GET catch-all version by id routes with embedded slash parsed correctly",
			method: http.MethodGet,
			path:   "/api/v1/mcp-registry/servers/" + testMCPServerName + "/versions/1.0.0?workspace=my-ns",
			setupMock: func(m *mlflowpkg.MockClient) {
				m.On("GetMCPServerVersion", tmock.Anything, testMCPServerName, "1.0.0").
					Return(&mcpregistry.MCPServerVersion{Name: testMCPServerName, Version: "1.0.0", CreationTimestamp: now, LastUpdatedTimestamp: now}, nil)
			},
			wantStatus: http.StatusOK,
		},
		{
			name:   "GET catch-all endpoint by id routes to GetMCPAccessEndpoint",
			method: http.MethodGet,
			path:   "/api/v1/mcp-registry/servers/" + testMCPServerName + "/endpoints/ep-1?workspace=my-ns",
			setupMock: func(m *mlflowpkg.MockClient) {
				m.On("GetMCPAccessEndpoint", tmock.Anything, testMCPServerName, "ep-1").
					Return(&mcpregistry.MCPAccessEndpoint{ID: "ep-1", ServerName: testMCPServerName, CreationTimestamp: now, LastUpdatedTimestamp: now}, nil)
			},
			wantStatus: http.StatusOK,
		},
		{
			name:   "POST catch-all versions sub-resource routes to CreateMCPServerVersion",
			method: http.MethodPost,
			path:   "/api/v1/mcp-registry/servers/" + testMCPServerName + "/versions?workspace=my-ns",
			body:   `{"server_json":{"name":"` + testMCPServerName + `","version":"1.0.0"}}`,
			setupMock: func(m *mlflowpkg.MockClient) {
				m.On("CreateMCPServerVersion", tmock.Anything, testMCPServerName, tmock.Anything, tmock.Anything).
					Return(&mcpregistry.MCPServerVersion{Name: testMCPServerName, Version: "1.0.0", CreationTimestamp: now, LastUpdatedTimestamp: now}, nil)
			},
			wantStatus: http.StatusCreated,
		},
		{
			name:   "PATCH catch-all server routes to UpdateMCPServer",
			method: http.MethodPatch,
			path:   "/api/v1/mcp-registry/servers/" + testMCPServerName + "?workspace=my-ns",
			body:   `{"description":"updated"}`,
			setupMock: func(m *mlflowpkg.MockClient) {
				m.On("UpdateMCPServer", tmock.Anything, testMCPServerName, tmock.Anything).
					Return(&mcpregistry.MCPServer{Name: testMCPServerName, CreationTimestamp: now, LastUpdatedTimestamp: now}, nil)
			},
			wantStatus: http.StatusOK,
		},
		{
			name:   "DELETE catch-all version routes to DeleteMCPServerVersion",
			method: http.MethodDelete,
			path:   "/api/v1/mcp-registry/servers/" + testMCPServerName + "/versions/1.0.0?workspace=my-ns",
			setupMock: func(m *mlflowpkg.MockClient) {
				m.On("DeleteMCPServerVersion", tmock.Anything, testMCPServerName, "1.0.0").Return(nil)
			},
			wantStatus: http.StatusNoContent,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockClient := &mlflowpkg.MockClient{}
			tt.setupMock(mockClient)

			factory := &mlflowpkg.MockFactory{}
			factory.On("GetClient", tmock.Anything, "", "my-ns").Return(mockClient, nil)

			app := newTestAppForRoutes(factory)
			server := httptest.NewServer(app.Routes())
			defer server.Close()

			var body io.Reader
			if tt.body != "" {
				body = bytes.NewBufferString(tt.body)
			}
			req, err := http.NewRequest(tt.method, server.URL+tt.path, body)
			require.NoError(t, err)
			if tt.body != "" {
				req.Header.Set("Content-Type", "application/json")
			}

			resp, err := http.DefaultClient.Do(req)
			require.NoError(t, err)
			defer resp.Body.Close()

			assert.Equalf(t, tt.wantStatus, resp.StatusCode, "unexpected status for %s %s", tt.method, tt.path)
			mockClient.AssertExpectations(t)
		})
	}
}

// TestRoutesMCPServerCatchAllUnrecognizedSubresource verifies that an
// unrecognized sub-resource under the catch-all path still reaches
// MLflowMCPServerCatchAllGetHandler (proving httprouter's "*rest" wildcard
// matched), which then rejects it via parseMCPServerPath with a 400 rather
// than the request falling through to apiRouter.NotFound.
func TestRoutesMCPServerCatchAllUnrecognizedSubresource(t *testing.T) {
	factory := &mlflowpkg.MockFactory{}
	factory.On("GetClient", tmock.Anything, "", "my-ns").Return(&mlflowpkg.MockClient{}, nil)
	app := newTestAppForRoutes(factory)
	server := httptest.NewServer(app.Routes())
	defer server.Close()

	resp, err := http.Get(server.URL + "/api/v1/mcp-registry/servers/" + testMCPServerName + "/tools?workspace=my-ns")
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
}

// TestRoutesUnknownAPIPathReturns404 sanity-checks that apiRouter.NotFound
// is wired up for a path outside any registered route.
func TestRoutesUnknownAPIPathReturns404(t *testing.T) {
	factory := &mlflowpkg.MockFactory{}
	app := newTestAppForRoutes(factory)
	server := httptest.NewServer(app.Routes())
	defer server.Close()

	resp, err := http.Get(server.URL + "/api/v1/does-not-exist")
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusNotFound, resp.StatusCode)
}
