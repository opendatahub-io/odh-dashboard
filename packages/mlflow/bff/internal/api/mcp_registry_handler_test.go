package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/mlflow-go/mlflow/mcpregistry"
	"github.com/opendatahub-io/mlflow/bff/internal/config"
	k8s "github.com/opendatahub-io/mlflow/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/mlflow/bff/internal/integrations/kubernetes/k8mocks"
	mlflowpkg "github.com/opendatahub-io/mlflow/bff/internal/integrations/mlflow"
	"github.com/opendatahub-io/mlflow/bff/internal/repositories"
	"github.com/stretchr/testify/assert"
	tmock "github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

// testMCPServerName is a valid "<namespace>/<slug>" name (per
// validateMCPServerName) used throughout these tests.
const testMCPServerName = "test.example/my-server"

func newTestAppWithMCPRegistryRepos() *App {
	return &App{
		logger:                  testLogger(),
		repositories:            repositories.NewRepositories(),
		kubernetesClientFactory: k8mocks.NewSimpleMockFactory(true, "", "my-ns"),
	}
}

func restParam(rest string) httprouter.Params {
	return httprouter.Params{{Key: "rest", Value: rest}}
}

// --- parseMCPServerPath ---

func TestParseMCPServerPath(t *testing.T) {
	tests := []struct {
		name           string
		rest           string
		wantServerName string
		wantSub        mcpServerSubresource
		wantEndpointID string
		wantErr        bool
	}{
		{name: "server only", rest: "/com.example/my-server", wantServerName: "com.example/my-server", wantSub: mcpSubresourceServer},
		{name: "versions", rest: "/com.example/my-server/versions", wantServerName: "com.example/my-server", wantSub: mcpSubresourceVersions},
		{name: "endpoints", rest: "/com.example/my-server/endpoints", wantServerName: "com.example/my-server", wantSub: mcpSubresourceEndpoints},
		{name: "endpoint by id", rest: "/com.example/my-server/endpoints/ep-1", wantServerName: "com.example/my-server", wantSub: mcpSubresourceEndpoint, wantEndpointID: "ep-1"},
		{name: "empty", rest: "", wantErr: true},
		{name: "single segment (no slash)", rest: "/my-server", wantErr: true},
		{name: "unrecognized subresource", rest: "/com.example/my-server/tools", wantErr: true},
		{name: "endpoints missing id", rest: "/com.example/my-server/endpoints/", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			name, sub, endpointID, err := parseMCPServerPath(tt.rest)
			if tt.wantErr {
				assert.Error(t, err)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tt.wantServerName, name)
			assert.Equal(t, tt.wantSub, sub)
			assert.Equal(t, tt.wantEndpointID, endpointID)
		})
	}
}

// --- validateMCPServerName ---

func TestValidateMCPServerName(t *testing.T) {
	validNames := []string{
		"com.example/my-server",
		"io.github.example/weather-server",
		"ab/cd",
		"a1.b2-c3/slug_with.chars-99",
	}
	for _, name := range validNames {
		t.Run("valid: "+name, func(t *testing.T) {
			assert.NoError(t, validateMCPServerName(name))
		})
	}

	invalidNames := []string{
		"",
		"no-slash-at-all",
		"too/many/slashes",
		"/leading-slash-empty-namespace",
		"trailing-slash-empty-slug/",
		"a/b_c", // underscore not allowed in namespace
		"-leadinghyphen/slug",
		"namespace-/slug", // namespace ends with hyphen
		"namespace/-slug", // slug starts with hyphen
		"namespace/slug-", // slug ends with hyphen
		"namespace/s",     // slug too short is fine actually if 1 char; but combined with hyphen this checks min length elsewhere
		// Reserved slugs collide with the literal sub-resource path
		// segments this BFF's catch-all routing reserves (and upstream's
		// _MCP_SERVER_RESERVED_SLUGS rejects for the same reason).
		"com.example/versions",
		"com.example/endpoints",
		"com.example/aliases",
		"com.example/tags",
	}
	for _, name := range invalidNames {
		t.Run("invalid: "+name, func(t *testing.T) {
			assert.Error(t, validateMCPServerName(name))
		})
	}
}

// --- validateMCPEndpointID ---

func TestValidateMCPEndpointID(t *testing.T) {
	assert.NoError(t, validateMCPEndpointID("ep-1"))
	assert.NoError(t, validateMCPEndpointID("static-endpoint-1"))

	invalidIDs := []string{"", ".", "..", "a/b", "../escape"}
	for _, id := range invalidIDs {
		t.Run("invalid: "+id, func(t *testing.T) {
			assert.Error(t, validateMCPEndpointID(id))
		})
	}
}

func TestValidateMCPEndpointURL(t *testing.T) {
	validURLs := []string{
		"https://mcp.example.com/x",
		"http://mcp.example.com:8080/x",
		"https://203.0.113.5/x", // public IP literal
	}
	for _, u := range validURLs {
		t.Run("valid: "+u, func(t *testing.T) {
			assert.NoError(t, validateMCPEndpointURL(u))
		})
	}

	invalidURLs := []string{
		"",
		"not-a-url",
		"ftp://mcp.example.com/x",
		"javascript:alert(1)",
		"https://",
		"http://localhost/x",
		"http://LOCALHOST/x",
		"http://127.0.0.1/x",
		"http://[::1]/x",
		"http://169.254.169.254/latest/meta-data/", // cloud metadata endpoint
		"http://10.0.0.5/x",
		"http://172.16.0.5/x",
		"http://192.168.1.5/x",
		"http://[fd00::1]/x", // unique-local IPv6
	}
	for _, u := range invalidURLs {
		t.Run("invalid: "+u, func(t *testing.T) {
			assert.Error(t, validateMCPEndpointURL(u))
		})
	}
}

func TestDeleteMCPAccessEndpointPathTraversalID(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()
	app.config = config.EnvConfig{AuthMethod: config.AuthMethodDisabled}

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/mcp-registry/servers/"+testMCPServerName+"/endpoints/..", nil)
	req = requestWithMLflowClient(req, &mlflowpkg.MockClient{})
	req = withWorkspace(req, "my-ns")
	rr := httptest.NewRecorder()

	app.MLflowMCPServerCatchAllDeleteHandler(rr, req, restParam("/"+testMCPServerName+"/endpoints/.."))

	// Caught by validateMCPEndpointID as a proper 400, rather than reaching
	// the MLflow Go client's own path-traversal guard as a misleading 500.
	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestValidateMCPServerNameSingleCharSegmentsRejected(t *testing.T) {
	// Each segment's regex requires a distinct first and last character
	// match, so a single-character segment (e.g. "a") cannot satisfy both
	// and is rejected, matching upstream's effective minimum length of 2.
	assert.Error(t, validateMCPServerName("a/b"))
}

// --- SearchMCPServers ---

func TestSearchMCPServersSuccess(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()
	mockClient := &mlflowpkg.MockClient{}

	now := time.Date(2024, 1, 15, 10, 30, 0, 0, time.UTC)
	mockClient.On("SearchMCPServers", tmock.Anything, tmock.Anything).
		Return(&mcpregistry.MCPServerList{
			Servers: []mcpregistry.MCPServer{
				{Name: testMCPServerName, CreationTimestamp: now, LastUpdatedTimestamp: now},
			},
		}, nil)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/mcp-registry/servers?workspace=my-ns", nil)
	req = requestWithMLflowClient(req, mockClient)
	req = withWorkspace(req, "my-ns")
	rr := httptest.NewRecorder()

	app.MLflowSearchMCPServersHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)
	var envelope MCPServersEnvelope
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&envelope))
	assert.Len(t, envelope.Data.Servers, 1)
	assert.Equal(t, testMCPServerName, envelope.Data.Servers[0].Name)
	mockClient.AssertExpectations(t)
}

func TestSearchMCPServersMissingWorkspace(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/mcp-registry/servers", nil)
	req = requestWithMLflowClient(req, &mlflowpkg.MockClient{})
	rr := httptest.NewRecorder()

	app.MLflowSearchMCPServersHandler(rr, req, nil)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestSearchMCPServersClientError(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("SearchMCPServers", tmock.Anything, tmock.Anything).
		Return(nil, fmt.Errorf("connection refused"))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/mcp-registry/servers?workspace=my-ns", nil)
	req = requestWithMLflowClient(req, mockClient)
	req = withWorkspace(req, "my-ns")
	rr := httptest.NewRecorder()

	app.MLflowSearchMCPServersHandler(rr, req, nil)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

func TestSearchMCPServersUnbalancedFilterIsBadRequest(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()
	mockClient := &mlflowpkg.MockClient{}

	query := url.Values{
		"workspace": {"my-ns"},
		"filter":    {"1=1) OR (1=1"},
	}
	req := httptest.NewRequest(http.MethodGet, "/api/v1/mcp-registry/servers?"+query.Encode(), nil)
	req = requestWithMLflowClient(req, mockClient)
	req = withWorkspace(req, "my-ns")
	rr := httptest.NewRecorder()

	app.MLflowSearchMCPServersHandler(rr, req, nil)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	mockClient.AssertNotCalled(t, "SearchMCPServers", tmock.Anything, tmock.Anything)
}

// --- CreateMCPServer ---

func TestCreateMCPServerSuccess(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()
	app.config = config.EnvConfig{AuthMethod: config.AuthMethodDisabled}
	mockClient := &mlflowpkg.MockClient{}

	now := time.Now()
	mockClient.On("CreateMCPServer", tmock.Anything, testMCPServerName, tmock.Anything).
		Return(&mcpregistry.MCPServer{Name: testMCPServerName, CreationTimestamp: now, LastUpdatedTimestamp: now}, nil)

	body := fmt.Sprintf(`{"name":%q,"description":"a test server"}`, testMCPServerName)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/mcp-registry/servers?workspace=my-ns", strings.NewReader(body))
	req = requestWithMLflowClient(req, mockClient)
	req = withWorkspace(req, "my-ns")
	rr := httptest.NewRecorder()

	app.MLflowCreateMCPServerHandler(rr, req, nil)

	assert.Equal(t, http.StatusCreated, rr.Code)
	assert.Contains(t, rr.Header().Get("Location"), testMCPServerName)
	assert.Contains(t, rr.Header().Get("Location"), "workspace=my-ns")

	var envelope MCPServerEnvelope
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&envelope))
	assert.Equal(t, testMCPServerName, envelope.Data.Name)
}

func TestCreateMCPServerInvalidName(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()

	body := `{"name":"no-slash-in-this-name"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/mcp-registry/servers", strings.NewReader(body))
	req = requestWithMLflowClient(req, &mlflowpkg.MockClient{})
	rr := httptest.NewRecorder()

	app.MLflowCreateMCPServerHandler(rr, req, nil)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestCreateMCPServerMissingName(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()

	body := `{"description":"missing name"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/mcp-registry/servers", strings.NewReader(body))
	req = requestWithMLflowClient(req, &mlflowpkg.MockClient{})
	rr := httptest.NewRecorder()

	app.MLflowCreateMCPServerHandler(rr, req, nil)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

// --- MLflowMCPServerCatchAllGetHandler: GetMCPServer ---

func TestGetMCPServerSuccess(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()
	mockClient := &mlflowpkg.MockClient{}

	now := time.Now()
	mockClient.On("GetMCPServer", tmock.Anything, testMCPServerName).
		Return(&mcpregistry.MCPServer{Name: testMCPServerName, CreationTimestamp: now, LastUpdatedTimestamp: now}, nil)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/mcp-registry/servers/"+testMCPServerName+"?workspace=my-ns", nil)
	req = requestWithMLflowClient(req, mockClient)
	req = withWorkspace(req, "my-ns")
	rr := httptest.NewRecorder()

	app.MLflowMCPServerCatchAllGetHandler(rr, req, restParam("/"+testMCPServerName))

	assert.Equal(t, http.StatusOK, rr.Code)
	var envelope MCPServerEnvelope
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&envelope))
	assert.Equal(t, testMCPServerName, envelope.Data.Name)
}

func TestGetMCPServerInvalidName(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/mcp-registry/servers/no-slash-here", nil)
	req = requestWithMLflowClient(req, &mlflowpkg.MockClient{})
	rr := httptest.NewRecorder()

	app.MLflowMCPServerCatchAllGetHandler(rr, req, restParam("/no-slash-here"))

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestGetMCPServerNotFound(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("GetMCPServer", tmock.Anything, "test.example/missing-server").
		Return(nil, fmt.Errorf("not found"))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/mcp-registry/servers/test.example/missing-server?workspace=my-ns", nil)
	req = requestWithMLflowClient(req, mockClient)
	req = withWorkspace(req, "my-ns")
	rr := httptest.NewRecorder()

	app.MLflowMCPServerCatchAllGetHandler(rr, req, restParam("/test.example/missing-server"))

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

// --- MLflowMCPServerCatchAllGetHandler: ListMCPServerVersions ---

func TestListMCPServerVersionsSuccess(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()
	mockClient := &mlflowpkg.MockClient{}

	now := time.Now()
	mockClient.On("SearchMCPServerVersions", tmock.Anything, testMCPServerName, tmock.Anything).
		Return(&mcpregistry.MCPServerVersionList{
			Versions: []mcpregistry.MCPServerVersion{
				{Name: testMCPServerName, Version: "1.0.0", CreationTimestamp: now, LastUpdatedTimestamp: now},
			},
		}, nil)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/mcp-registry/servers/"+testMCPServerName+"/versions?workspace=my-ns", nil)
	req = requestWithMLflowClient(req, mockClient)
	req = withWorkspace(req, "my-ns")
	rr := httptest.NewRecorder()

	app.MLflowMCPServerCatchAllGetHandler(rr, req, restParam("/"+testMCPServerName+"/versions"))

	assert.Equal(t, http.StatusOK, rr.Code)
	var envelope MCPServerVersionsEnvelope
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&envelope))
	assert.Len(t, envelope.Data.Versions, 1)
}

// --- MLflowMCPServerCatchAllPostHandler: CreateMCPServerVersion ---

func TestCreateMCPServerVersionSuccess(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()
	app.config = config.EnvConfig{AuthMethod: config.AuthMethodDisabled}
	mockClient := &mlflowpkg.MockClient{}

	now := time.Now()
	serverJSON := map[string]any{"name": testMCPServerName}
	mockClient.On("CreateMCPServerVersion", tmock.Anything, testMCPServerName, tmock.Anything, tmock.Anything).
		Return(&mcpregistry.MCPServerVersion{
			Name: testMCPServerName, Version: "1.0.0", ServerJSON: serverJSON,
			CreationTimestamp: now, LastUpdatedTimestamp: now,
		}, nil)

	body := fmt.Sprintf(`{"server_json":{"name":%q}}`, testMCPServerName)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/mcp-registry/servers/"+testMCPServerName+"/versions?workspace=my-ns", strings.NewReader(body))
	req = requestWithMLflowClient(req, mockClient)
	req = withWorkspace(req, "my-ns")
	rr := httptest.NewRecorder()

	app.MLflowMCPServerCatchAllPostHandler(rr, req, restParam("/"+testMCPServerName+"/versions"))

	assert.Equal(t, http.StatusCreated, rr.Code)
	assert.Contains(t, rr.Header().Get("Location"), "/"+testMCPServerName+"/versions/1.0.0")
	assert.Contains(t, rr.Header().Get("Location"), "workspace=my-ns")

	var envelope MCPServerVersionEnvelope
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&envelope))
	assert.Equal(t, "1.0.0", envelope.Data.Version)
}

func TestCreateMCPServerVersionMissingServerJSON(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()

	body := `{"display_name":"missing server_json"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/mcp-registry/servers/"+testMCPServerName+"/versions", strings.NewReader(body))
	req = requestWithMLflowClient(req, &mlflowpkg.MockClient{})
	rr := httptest.NewRecorder()

	app.MLflowMCPServerCatchAllPostHandler(rr, req, restParam("/"+testMCPServerName+"/versions"))

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestCreateMCPServerVersionInvalidServerName(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()

	// The catch-all path parser always treats the first two "/"-separated
	// segments as the server name, so a single-segment name can't reach a
	// "/versions" suffix at all (it just gets absorbed as the slug half of
	// a syntactically-two-segment name). To exercise name validation on this
	// route, use a namespace segment with a disallowed character instead.
	body := `{"server_json":{"name":"x"}}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/mcp-registry/servers/bad!namespace/my-slug/versions", strings.NewReader(body))
	req = requestWithMLflowClient(req, &mlflowpkg.MockClient{})
	rr := httptest.NewRecorder()

	app.MLflowMCPServerCatchAllPostHandler(rr, req, restParam("/bad!namespace/my-slug/versions"))

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

// --- MLflowMCPServerCatchAllPostHandler: CreateMCPAccessEndpoint ---

func TestCreateMCPAccessEndpointSuccess(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()
	app.config = config.EnvConfig{AuthMethod: config.AuthMethodDisabled}
	mockClient := &mlflowpkg.MockClient{}

	now := time.Now()
	mockClient.On("CreateMCPAccessEndpoint", tmock.Anything, testMCPServerName, "https://mcp.example.com/x", tmock.Anything).
		Return(&mcpregistry.MCPAccessEndpoint{
			ID: "ep-1", ServerName: testMCPServerName, EndpointURL: "https://mcp.example.com/x",
			CreationTimestamp: now, LastUpdatedTimestamp: now,
		}, nil)

	body := `{"endpoint_url":"https://mcp.example.com/x"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/mcp-registry/servers/"+testMCPServerName+"/endpoints?workspace=my-ns", strings.NewReader(body))
	req = requestWithMLflowClient(req, mockClient)
	req = withWorkspace(req, "my-ns")
	rr := httptest.NewRecorder()

	app.MLflowMCPServerCatchAllPostHandler(rr, req, restParam("/"+testMCPServerName+"/endpoints"))

	assert.Equal(t, http.StatusCreated, rr.Code)
	assert.Contains(t, rr.Header().Get("Location"), "/"+testMCPServerName+"/endpoints/ep-1")
	assert.Contains(t, rr.Header().Get("Location"), "workspace=my-ns")

	var envelope MCPAccessEndpointEnvelope
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&envelope))
	assert.Equal(t, "ep-1", envelope.Data.ID)
}

func TestCreateMCPAccessEndpointMissingURL(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()

	body := `{}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/mcp-registry/servers/"+testMCPServerName+"/endpoints", strings.NewReader(body))
	req = requestWithMLflowClient(req, &mlflowpkg.MockClient{})
	rr := httptest.NewRecorder()

	app.MLflowMCPServerCatchAllPostHandler(rr, req, restParam("/"+testMCPServerName+"/endpoints"))

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestCreateMCPAccessEndpointMutuallyExclusiveFields(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()

	body := `{"endpoint_url":"https://mcp.example.com/x","server_version":"1.0.0","server_alias":"latest"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/mcp-registry/servers/"+testMCPServerName+"/endpoints", strings.NewReader(body))
	req = requestWithMLflowClient(req, &mlflowpkg.MockClient{})
	rr := httptest.NewRecorder()

	app.MLflowMCPServerCatchAllPostHandler(rr, req, restParam("/"+testMCPServerName+"/endpoints"))

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestMCPServerCatchAllPostUnrecognizedSubresource(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()

	req := httptest.NewRequest(http.MethodPost, "/api/v1/mcp-registry/servers/"+testMCPServerName, nil)
	req = requestWithMLflowClient(req, &mlflowpkg.MockClient{})
	rr := httptest.NewRecorder()

	// A bare "<namespace>/<slug>" POST (no /versions or /endpoints suffix)
	// isn't a defined operation.
	app.MLflowMCPServerCatchAllPostHandler(rr, req, restParam("/"+testMCPServerName))

	assert.Equal(t, http.StatusNotFound, rr.Code)
}

// --- MLflowMCPServerCatchAllGetHandler: SearchMCPAccessEndpoints ---

func TestSearchMCPAccessEndpointsSuccess(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()
	mockClient := &mlflowpkg.MockClient{}

	now := time.Now()
	mockClient.On("SearchMCPAccessEndpoints", tmock.Anything, tmock.Anything).
		Return(&mcpregistry.MCPAccessEndpointList{
			Endpoints: []mcpregistry.MCPAccessEndpoint{
				{ID: "ep-1", ServerName: testMCPServerName, CreationTimestamp: now, LastUpdatedTimestamp: now},
			},
		}, nil)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/mcp-registry/servers/"+testMCPServerName+"/endpoints?workspace=my-ns", nil)
	req = requestWithMLflowClient(req, mockClient)
	req = withWorkspace(req, "my-ns")
	rr := httptest.NewRecorder()

	app.MLflowMCPServerCatchAllGetHandler(rr, req, restParam("/"+testMCPServerName+"/endpoints"))

	assert.Equal(t, http.StatusOK, rr.Code)
	var envelope MCPAccessEndpointsEnvelope
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&envelope))
	assert.Len(t, envelope.Data.Endpoints, 1)
}

// --- MLflowMCPServerCatchAllDeleteHandler: DeleteMCPAccessEndpoint ---

func TestDeleteMCPAccessEndpointSuccess(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()
	app.config = config.EnvConfig{AuthMethod: config.AuthMethodDisabled}
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("DeleteMCPAccessEndpoint", tmock.Anything, testMCPServerName, "ep-1").Return(nil)

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/mcp-registry/servers/"+testMCPServerName+"/endpoints/ep-1?workspace=my-ns", nil)
	req = requestWithMLflowClient(req, mockClient)
	req = withWorkspace(req, "my-ns")
	rr := httptest.NewRecorder()

	app.MLflowMCPServerCatchAllDeleteHandler(rr, req, restParam("/"+testMCPServerName+"/endpoints/ep-1"))

	assert.Equal(t, http.StatusNoContent, rr.Code)
	mockClient.AssertExpectations(t)
}

func TestDeleteMCPAccessEndpointMissingID(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/mcp-registry/servers/"+testMCPServerName+"/endpoints/", nil)
	req = requestWithMLflowClient(req, &mlflowpkg.MockClient{})
	rr := httptest.NewRecorder()

	app.MLflowMCPServerCatchAllDeleteHandler(rr, req, restParam("/"+testMCPServerName+"/endpoints/"))

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestMCPServerCatchAllDeleteUnrecognizedSubresource(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/mcp-registry/servers/"+testMCPServerName+"/versions", nil)
	req = requestWithMLflowClient(req, &mlflowpkg.MockClient{})
	rr := httptest.NewRecorder()

	// DELETE is only defined for /endpoints/:endpointId.
	app.MLflowMCPServerCatchAllDeleteHandler(rr, req, restParam("/"+testMCPServerName+"/versions"))

	assert.Equal(t, http.StatusNotFound, rr.Code)
}

// --- Permission Tests ---

func TestMCPRegistryHandlerPermissions(t *testing.T) {
	tests := []struct {
		name            string
		handler         string
		verb            string
		canWrite        bool
		permissionError bool
		method          string
		path            string
		body            string
		rest            string
		wantStatus      int
		setupMock       func(*mlflowpkg.MockClient)
		assertNotCalled string
	}{
		{
			name:            "CreateMCPServer forbidden without permission",
			handler:         "createServer",
			verb:            "create",
			canWrite:        false,
			method:          http.MethodPost,
			path:            "/api/v1/mcp-registry/servers?workspace=my-ns",
			body:            fmt.Sprintf(`{"name":%q}`, testMCPServerName),
			wantStatus:      http.StatusForbidden,
			assertNotCalled: "CreateMCPServer",
		},
		{
			name:       "CreateMCPServer success with permission",
			handler:    "createServer",
			verb:       "create",
			canWrite:   true,
			method:     http.MethodPost,
			path:       "/api/v1/mcp-registry/servers?workspace=my-ns",
			body:       fmt.Sprintf(`{"name":%q}`, testMCPServerName),
			wantStatus: http.StatusCreated,
			setupMock: func(m *mlflowpkg.MockClient) {
				now := time.Now()
				m.On("CreateMCPServer", tmock.Anything, testMCPServerName, tmock.Anything).
					Return(&mcpregistry.MCPServer{Name: testMCPServerName, CreationTimestamp: now, LastUpdatedTimestamp: now}, nil)
			},
		},
		{
			name:     "CreateMCPServerVersion forbidden without permission",
			handler:  "createVersion",
			verb:     "create",
			canWrite: false,
			method:   http.MethodPost,
			path:     "/api/v1/mcp-registry/servers/" + testMCPServerName + "/versions?workspace=my-ns",
			body:     fmt.Sprintf(`{"server_json":{"name":%q}}`, testMCPServerName),
			rest:     "/" + testMCPServerName + "/versions",

			wantStatus:      http.StatusForbidden,
			assertNotCalled: "CreateMCPServerVersion",
		},
		{
			name:     "CreateMCPServerVersion success with permission",
			handler:  "createVersion",
			verb:     "create",
			canWrite: true,
			method:   http.MethodPost,
			path:     "/api/v1/mcp-registry/servers/" + testMCPServerName + "/versions?workspace=my-ns",
			body:     fmt.Sprintf(`{"server_json":{"name":%q}}`, testMCPServerName),
			rest:     "/" + testMCPServerName + "/versions",

			wantStatus: http.StatusCreated,
			setupMock: func(m *mlflowpkg.MockClient) {
				now := time.Now()
				m.On("CreateMCPServerVersion", tmock.Anything, testMCPServerName, tmock.Anything, tmock.Anything).
					Return(&mcpregistry.MCPServerVersion{Name: testMCPServerName, Version: "1.0.0", CreationTimestamp: now, LastUpdatedTimestamp: now}, nil)
			},
		},
		{
			name:     "CreateMCPAccessEndpoint forbidden without permission",
			handler:  "createEndpoint",
			verb:     "create",
			canWrite: false,
			method:   http.MethodPost,
			path:     "/api/v1/mcp-registry/servers/" + testMCPServerName + "/endpoints?workspace=my-ns",
			body:     `{"endpoint_url":"https://mcp.example.com/x"}`,
			rest:     "/" + testMCPServerName + "/endpoints",

			wantStatus:      http.StatusForbidden,
			assertNotCalled: "CreateMCPAccessEndpoint",
		},
		{
			name:     "CreateMCPAccessEndpoint success with permission",
			handler:  "createEndpoint",
			verb:     "create",
			canWrite: true,
			method:   http.MethodPost,
			path:     "/api/v1/mcp-registry/servers/" + testMCPServerName + "/endpoints?workspace=my-ns",
			body:     `{"endpoint_url":"https://mcp.example.com/x"}`,
			rest:     "/" + testMCPServerName + "/endpoints",

			wantStatus: http.StatusCreated,
			setupMock: func(m *mlflowpkg.MockClient) {
				now := time.Now()
				m.On("CreateMCPAccessEndpoint", tmock.Anything, testMCPServerName, "https://mcp.example.com/x", tmock.Anything).
					Return(&mcpregistry.MCPAccessEndpoint{ID: "ep-1", ServerName: testMCPServerName, CreationTimestamp: now, LastUpdatedTimestamp: now}, nil)
			},
		},
		{
			name:     "DeleteMCPAccessEndpoint forbidden without permission",
			handler:  "deleteEndpoint",
			verb:     "delete",
			canWrite: false,
			method:   http.MethodDelete,
			path:     "/api/v1/mcp-registry/servers/" + testMCPServerName + "/endpoints/ep-1?workspace=my-ns",
			rest:     "/" + testMCPServerName + "/endpoints/ep-1",

			wantStatus:      http.StatusForbidden,
			assertNotCalled: "DeleteMCPAccessEndpoint",
		},
		{
			name:     "DeleteMCPAccessEndpoint success with permission",
			handler:  "deleteEndpoint",
			verb:     "delete",
			canWrite: true,
			method:   http.MethodDelete,
			path:     "/api/v1/mcp-registry/servers/" + testMCPServerName + "/endpoints/ep-1?workspace=my-ns",
			rest:     "/" + testMCPServerName + "/endpoints/ep-1",

			wantStatus: http.StatusNoContent,
			setupMock: func(m *mlflowpkg.MockClient) {
				m.On("DeleteMCPAccessEndpoint", tmock.Anything, testMCPServerName, "ep-1").Return(nil)
			},
		},
		{
			name:            "CreateMCPServer permission check error",
			handler:         "createServer",
			verb:            "create",
			permissionError: true,
			method:          http.MethodPost,
			path:            "/api/v1/mcp-registry/servers?workspace=my-ns",
			body:            fmt.Sprintf(`{"name":%q}`, testMCPServerName),
			wantStatus:      http.StatusInternalServerError,
			assertNotCalled: "CreateMCPServer",
		},
		{
			name:            "DeleteMCPAccessEndpoint permission check error",
			handler:         "deleteEndpoint",
			verb:            "delete",
			permissionError: true,
			method:          http.MethodDelete,
			path:            "/api/v1/mcp-registry/servers/" + testMCPServerName + "/endpoints/ep-1?workspace=my-ns",
			rest:            "/" + testMCPServerName + "/endpoints/ep-1",
			wantStatus:      http.StatusInternalServerError,
			assertNotCalled: "DeleteMCPAccessEndpoint",
		},
		{
			name:            "CreateMCPServer invalid verb error",
			handler:         "createServer",
			verb:            "delete",
			canWrite:        false,
			method:          http.MethodPost,
			path:            "/api/v1/mcp-registry/servers?workspace=my-ns",
			body:            fmt.Sprintf(`{"name":%q}`, testMCPServerName),
			wantStatus:      http.StatusInternalServerError,
			assertNotCalled: "CreateMCPServer",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var factory k8s.KubernetesClientFactory
			if tt.permissionError {
				factory = k8mocks.NewSimpleMockFactoryWithError()
			} else {
				factory = k8mocks.NewSimpleMockFactory(tt.canWrite, tt.verb, "my-ns")
			}

			app := &App{
				config:                  config.EnvConfig{AuthMethod: config.AuthMethodUser},
				logger:                  testLogger(),
				repositories:            repositories.NewRepositories(),
				kubernetesClientFactory: factory,
			}

			mockClient := &mlflowpkg.MockClient{}
			if tt.setupMock != nil {
				tt.setupMock(mockClient)
			}

			var req *http.Request
			if tt.body != "" {
				req = httptest.NewRequest(tt.method, tt.path, strings.NewReader(tt.body))
			} else {
				req = httptest.NewRequest(tt.method, tt.path, nil)
			}
			req = requestWithMLflowClient(req, mockClient)
			req = withWorkspace(req, "my-ns")
			req = withIdentityToken(req, "test-token")
			rr := httptest.NewRecorder()

			switch tt.handler {
			case "createServer":
				app.MLflowCreateMCPServerHandler(rr, req, nil)
			case "createVersion":
				app.MLflowMCPServerCatchAllPostHandler(rr, req, restParam(tt.rest))
			case "createEndpoint":
				app.MLflowMCPServerCatchAllPostHandler(rr, req, restParam(tt.rest))
			case "deleteEndpoint":
				app.MLflowMCPServerCatchAllDeleteHandler(rr, req, restParam(tt.rest))
			}

			assert.Equal(t, tt.wantStatus, rr.Code)
			if tt.assertNotCalled != "" {
				mockClient.AssertNumberOfCalls(t, tt.assertNotCalled, 0)
			} else if tt.setupMock != nil {
				mockClient.AssertExpectations(t)
			}
		})
	}
}

func TestEnforceMCPWritePermissionBypassedWhenAuthDisabled(t *testing.T) {
	app := &App{
		config: config.EnvConfig{AuthMethod: config.AuthMethodDisabled},
		logger: testLogger(),
		// kubernetesClientFactory intentionally nil: bypass must not call it
	}
	req := httptest.NewRequest(http.MethodPost, "/", nil)
	rr := httptest.NewRecorder()
	result := app.enforceMCPWritePermission(context.Background(), rr, req, "my-ns", "create")
	assert.True(t, result)
	assert.Empty(t, rr.Body.String())
}
