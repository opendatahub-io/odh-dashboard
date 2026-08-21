package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/julienschmidt/httprouter"
	sdkmlflow "github.com/opendatahub-io/mlflow-go/mlflow"
	"github.com/opendatahub-io/mlflow-go/mlflow/mcpregistry"
	"github.com/opendatahub-io/mlflow/bff/internal/config"
	k8s "github.com/opendatahub-io/mlflow/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/mlflow/bff/internal/integrations/kubernetes/k8mocks"
	mlflowpkg "github.com/opendatahub-io/mlflow/bff/internal/integrations/mlflow"
	"github.com/opendatahub-io/mlflow/bff/internal/models"
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
		wantVersion    string
		wantKey        string
		wantAlias      string
		wantEndpointID string
		wantErr        bool
	}{
		{name: "server only", rest: "/com.example/my-server", wantServerName: "com.example/my-server", wantSub: mcpSubresourceServer},
		{name: "versions", rest: "/com.example/my-server/versions", wantServerName: "com.example/my-server", wantSub: mcpSubresourceVersions},
		{name: "version by id", rest: "/com.example/my-server/versions/1.0.0", wantServerName: "com.example/my-server", wantSub: mcpSubresourceVersion, wantVersion: "1.0.0"},
		{name: "version tags", rest: "/com.example/my-server/versions/1.0.0/tags", wantServerName: "com.example/my-server", wantSub: mcpSubresourceVersionTags, wantVersion: "1.0.0"},
		{name: "version tag by key", rest: "/com.example/my-server/versions/1.0.0/tags/stability", wantServerName: "com.example/my-server", wantSub: mcpSubresourceVersionTag, wantVersion: "1.0.0", wantKey: "stability"},
		{name: "tags", rest: "/com.example/my-server/tags", wantServerName: "com.example/my-server", wantSub: mcpSubresourceTags},
		{name: "tag by key", rest: "/com.example/my-server/tags/category", wantServerName: "com.example/my-server", wantSub: mcpSubresourceTag, wantKey: "category"},
		{name: "aliases", rest: "/com.example/my-server/aliases", wantServerName: "com.example/my-server", wantSub: mcpSubresourceAliases},
		{name: "alias by name", rest: "/com.example/my-server/aliases/production", wantServerName: "com.example/my-server", wantSub: mcpSubresourceAlias, wantAlias: "production"},
		{name: "endpoints", rest: "/com.example/my-server/endpoints", wantServerName: "com.example/my-server", wantSub: mcpSubresourceEndpoints},
		{name: "endpoint by id", rest: "/com.example/my-server/endpoints/ep-1", wantServerName: "com.example/my-server", wantSub: mcpSubresourceEndpoint, wantEndpointID: "ep-1"},
		{name: "empty", rest: "", wantErr: true},
		{name: "single segment (no slash)", rest: "/my-server", wantErr: true},
		{name: "unrecognized subresource", rest: "/com.example/my-server/tools", wantErr: true},
		{name: "endpoints missing id", rest: "/com.example/my-server/endpoints/", wantErr: true},
		{name: "versions missing id", rest: "/com.example/my-server/versions/", wantErr: true},
		{name: "tags missing key", rest: "/com.example/my-server/tags/", wantErr: true},
		{name: "aliases missing name", rest: "/com.example/my-server/aliases/", wantErr: true},
		{name: "version tags missing key", rest: "/com.example/my-server/versions/1.0.0/tags/", wantErr: true},
		{name: "version tags wrong sub-subresource", rest: "/com.example/my-server/versions/1.0.0/aliases", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			p, err := parseMCPServerPath(tt.rest)
			if tt.wantErr {
				assert.Error(t, err)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tt.wantServerName, p.Name)
			assert.Equal(t, tt.wantSub, p.Subresource)
			assert.Equal(t, tt.wantVersion, p.Version)
			assert.Equal(t, tt.wantKey, p.Key)
			assert.Equal(t, tt.wantAlias, p.Alias)
			assert.Equal(t, tt.wantEndpointID, p.EndpointID)
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
		"a/b_c", // namespace "a" is only 1 char; namespace regex requires >= 2 chars (distinct start+end alphanumeric); the underscore in the slug is actually allowed
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

// --- validateMCPPathSegment (endpoint id) ---

func TestValidateMCPEndpointID(t *testing.T) {
	assert.NoError(t, validateMCPPathSegment("endpoint id", "ep-1"))
	assert.NoError(t, validateMCPPathSegment("endpoint id", "static-endpoint-1"))

	invalidIDs := []string{"", ".", "..", "a/b", "../escape", "%2e%2e", "%2F", "%2E%2E%2Fescape"}
	for _, id := range invalidIDs {
		t.Run("invalid: "+id, func(t *testing.T) {
			assert.Error(t, validateMCPPathSegment("endpoint id", id))
		})
	}
}

func TestValidateMCPEndpointURL(t *testing.T) {
	validURLs := []string{
		"https://mcp.example.com/x",
		"http://mcp.example.com:8080/x",
		"https://203.0.113.5/x",    // public IP literal
		"https://100.63.255.255/x", // just below the CGNAT block (100.64.0.0/10)
		"https://100.128.0.1/x",    // just above the CGNAT block
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
		"http://localhost./x", // trailing "." denotes the DNS root; resolves identically to "localhost"
		"http://LOCALHOST./x",
		"http://127.0.0.1/x",
		"http://[::1]/x",
		"http://[::127.0.0.1]/x",      // deprecated "IPv4-compatible IPv6" loopback; To4() doesn't unwrap this form
		"http://[::ffff:127.0.0.1]/x", // "IPv4-mapped" loopback (To4() does unwrap this one, but covered for completeness)
		"http://169.254.169.254/latest/meta-data/", // cloud metadata endpoint
		"http://10.0.0.5/x",
		"http://172.16.0.5/x",
		"http://192.168.1.5/x",
		"http://[::10.0.0.5]/x",                // deprecated "IPv4-compatible IPv6" private address
		"http://[fd00::1]/x",                   // unique-local IPv6
		"http://100.64.0.1/x",                  // CGNAT (RFC 6598), not covered by net.IP.IsPrivate()
		"http://100.100.0.1/x",                 // still within 100.64.0.0/10
		"https://user:token@mcp.example.com/x", // embedded credentials, would leak into logs
		"https://user@mcp.example.com/x",       // username-only userinfo
	}
	for _, u := range invalidURLs {
		t.Run("invalid: "+u, func(t *testing.T) {
			assert.Error(t, validateMCPEndpointURL(u))
		})
	}
}

func TestIsPrivateIP(t *testing.T) {
	privateIPs := []string{
		"127.0.0.1",
		"10.0.0.1",
		"172.16.0.1",
		"192.168.1.1",
		"169.254.1.1",
		"0.0.0.0",
		"::1",
		"fd00::1",
		"::ffff:127.0.0.1", // IPv4-mapped; net.IP.To4() unwraps this natively
		"::127.0.0.1",      // deprecated IPv4-compatible form; needs the explicit fallback
		"::10.0.0.1",       // deprecated IPv4-compatible form, RFC 1918 range
		"100.64.0.1",       // CGNAT, start of range
		"100.100.0.1",      // CGNAT, mid-range
		"100.127.255.255",  // CGNAT, end of range
	}
	for _, s := range privateIPs {
		t.Run("private: "+s, func(t *testing.T) {
			ip := net.ParseIP(s)
			require.NotNil(t, ip, "test IP %q failed to parse", s)
			assert.True(t, isPrivateIP(ip))
		})
	}

	publicIPs := []string{
		"203.0.113.5",
		"8.8.8.8",
		"100.63.255.255", // just below the CGNAT block
		"100.128.0.1",    // just above the CGNAT block
		"2001:db8::1",    // public/documentation IPv6
	}
	for _, s := range publicIPs {
		t.Run("public: "+s, func(t *testing.T) {
			ip := net.ParseIP(s)
			require.NotNil(t, ip, "test IP %q failed to parse", s)
			assert.False(t, isPrivateIP(ip))
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

	// Caught by parseMCPServerPath as a proper 400, rather than reaching
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
		Return(nil, &sdkmlflow.APIError{StatusCode: http.StatusNotFound, Message: "not found"})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/mcp-registry/servers/test.example/missing-server?workspace=my-ns", nil)
	req = requestWithMLflowClient(req, mockClient)
	req = withWorkspace(req, "my-ns")
	rr := httptest.NewRecorder()

	app.MLflowMCPServerCatchAllGetHandler(rr, req, restParam("/test.example/missing-server"))

	assert.Equal(t, http.StatusNotFound, rr.Code)

	var errResp HTTPError
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&errResp))
	assert.Equal(t, "not_found", errResp.Error.Code)
}

// --- MLflowMCPServerCatchAllPatchHandler: UpdateMCPServer ---

func TestUpdateMCPServerSuccess(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()
	app.config = config.EnvConfig{AuthMethod: config.AuthMethodDisabled}
	mockClient := &mlflowpkg.MockClient{}

	now := time.Now()
	mockClient.On("UpdateMCPServer", tmock.Anything, testMCPServerName, tmock.Anything).
		Return(&mcpregistry.MCPServer{Name: testMCPServerName, DisplayName: "New Name", CreationTimestamp: now, LastUpdatedTimestamp: now}, nil)

	body := `{"display_name":"New Name"}`
	req := httptest.NewRequest(http.MethodPatch, "/api/v1/mcp-registry/servers/"+testMCPServerName+"?workspace=my-ns", strings.NewReader(body))
	req = requestWithMLflowClient(req, mockClient)
	req = withWorkspace(req, "my-ns")
	rr := httptest.NewRecorder()

	app.MLflowMCPServerCatchAllPatchHandler(rr, req, restParam("/"+testMCPServerName))

	assert.Equal(t, http.StatusOK, rr.Code)
	var envelope MCPServerEnvelope
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&envelope))
	assert.Equal(t, "New Name", envelope.Data.DisplayName)
	mockClient.AssertExpectations(t)
}

func TestUpdateMCPServerInvalidBody(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()

	req := httptest.NewRequest(http.MethodPatch, "/api/v1/mcp-registry/servers/"+testMCPServerName, strings.NewReader("not json"))
	req = requestWithMLflowClient(req, &mlflowpkg.MockClient{})
	rr := httptest.NewRecorder()

	app.MLflowMCPServerCatchAllPatchHandler(rr, req, restParam("/"+testMCPServerName))

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestMCPServerCatchAllPatchUnrecognizedSubresource(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()

	req := httptest.NewRequest(http.MethodPatch, "/api/v1/mcp-registry/servers/"+testMCPServerName+"/tags", strings.NewReader("{}"))
	req = requestWithMLflowClient(req, &mlflowpkg.MockClient{})
	rr := httptest.NewRecorder()

	app.MLflowMCPServerCatchAllPatchHandler(rr, req, restParam("/"+testMCPServerName+"/tags"))

	assert.Equal(t, http.StatusNotFound, rr.Code)
}

// --- MLflowMCPServerCatchAllDeleteHandler: DeleteMCPServer ---

func TestDeleteMCPServerSuccess(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()
	app.config = config.EnvConfig{AuthMethod: config.AuthMethodDisabled}
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("DeleteMCPServer", tmock.Anything, testMCPServerName).Return(nil)

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/mcp-registry/servers/"+testMCPServerName+"?workspace=my-ns", nil)
	req = requestWithMLflowClient(req, mockClient)
	req = withWorkspace(req, "my-ns")
	rr := httptest.NewRecorder()

	app.MLflowMCPServerCatchAllDeleteHandler(rr, req, restParam("/"+testMCPServerName))

	assert.Equal(t, http.StatusNoContent, rr.Code)
	mockClient.AssertExpectations(t)
}

// --- MLflowMCPServerCatchAllPostHandler / DeleteHandler: server tags ---

func TestSetMCPServerTagSuccess(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()
	app.config = config.EnvConfig{AuthMethod: config.AuthMethodDisabled}
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("SetMCPServerTag", tmock.Anything, testMCPServerName, "category", "weather").Return(nil)

	body := `{"key":"category","value":"weather"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/mcp-registry/servers/"+testMCPServerName+"/tags?workspace=my-ns", strings.NewReader(body))
	req = requestWithMLflowClient(req, mockClient)
	req = withWorkspace(req, "my-ns")
	rr := httptest.NewRecorder()

	app.MLflowMCPServerCatchAllPostHandler(rr, req, restParam("/"+testMCPServerName+"/tags"))

	assert.Equal(t, http.StatusOK, rr.Code)
	mockClient.AssertExpectations(t)
}

func TestSetMCPServerTagMissingKey(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()

	body := `{"value":"weather"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/mcp-registry/servers/"+testMCPServerName+"/tags", strings.NewReader(body))
	req = requestWithMLflowClient(req, &mlflowpkg.MockClient{})
	rr := httptest.NewRecorder()

	app.MLflowMCPServerCatchAllPostHandler(rr, req, restParam("/"+testMCPServerName+"/tags"))

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestRegisterMCPServerSuccess(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()
	app.config = config.EnvConfig{AuthMethod: config.AuthMethodDisabled}
	mockClient := &mlflowpkg.MockClient{}

	now := time.Now()
	serverJSON := map[string]any{"name": testMCPServerName, "version": "1.0.0"}
	mockClient.On("CreateMCPServerVersion", tmock.Anything, testMCPServerName, tmock.Anything, tmock.Anything).
		Return(&mcpregistry.MCPServerVersion{
			Name: testMCPServerName, Version: "1.0.0", ServerJSON: serverJSON,
			CreationTimestamp: now, LastUpdatedTimestamp: now,
		}, nil)
	mockClient.On("UpdateMCPServer", tmock.Anything, testMCPServerName, tmock.Anything).
		Return(&mcpregistry.MCPServer{Name: testMCPServerName, CreationTimestamp: now, LastUpdatedTimestamp: now}, nil)
	mockClient.On("SetMCPServerTag", tmock.Anything, testMCPServerName, "team", "platform").Return(nil)

	body := `{
		"name":"` + testMCPServerName + `",
		"server_json":{"name":"` + testMCPServerName + `","version":"1.0.0"},
		"status":"draft",
		"display_name":"My Server",
		"icons":[{"src":"https://example.com/icon.svg","theme":"light"},{"src":"http://insecure.example/x.svg"}],
		"tags":[{"key":"team","value":"platform"},{"key":"","value":"skip"},{"key":"team","value":"platform"}]
	}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/mcp-registry/register?workspace=my-ns", strings.NewReader(body))
	req = requestWithMLflowClient(req, mockClient)
	req = withWorkspace(req, "my-ns")
	rr := httptest.NewRecorder()

	app.MLflowRegisterMCPServerHandler(rr, req, nil)

	assert.Equal(t, http.StatusCreated, rr.Code)
	assert.Equal(t, mcpServerVersionLocation(testMCPServerName, "1.0.0", "my-ns"), rr.Header().Get("Location"))
	var envelope MCPRegisterEnvelope
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&envelope))
	assert.Equal(t, "1.0.0", envelope.Data.Version.Version)
	assert.Empty(t, envelope.Data.MetadataError)
	assert.Empty(t, envelope.Data.FailedTagKeys)
	mockClient.AssertExpectations(t)
}

func TestRegisterMCPServerSoftFailures(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()
	app.config = config.EnvConfig{AuthMethod: config.AuthMethodDisabled}
	mockClient := &mlflowpkg.MockClient{}

	now := time.Now()
	serverJSON := map[string]any{"name": testMCPServerName, "version": "1.0.0"}
	mockClient.On("CreateMCPServerVersion", tmock.Anything, testMCPServerName, tmock.Anything, tmock.Anything).
		Return(&mcpregistry.MCPServerVersion{
			Name: testMCPServerName, Version: "1.0.0", ServerJSON: serverJSON,
			CreationTimestamp: now, LastUpdatedTimestamp: now,
		}, nil)
	mockClient.On("UpdateMCPServer", tmock.Anything, testMCPServerName, tmock.Anything).
		Return((*mcpregistry.MCPServer)(nil), fmt.Errorf("metadata boom"))
	mockClient.On("SetMCPServerTag", tmock.Anything, testMCPServerName, "team", "platform").
		Return(fmt.Errorf("tag boom"))

	body := `{
		"name":"` + testMCPServerName + `",
		"server_json":{"name":"` + testMCPServerName + `","version":"1.0.0"},
		"display_name":"My Server",
		"tags":[{"key":"team","value":"platform"}]
	}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/mcp-registry/register?workspace=my-ns", strings.NewReader(body))
	req = requestWithMLflowClient(req, mockClient)
	req = withWorkspace(req, "my-ns")
	rr := httptest.NewRecorder()

	app.MLflowRegisterMCPServerHandler(rr, req, nil)

	assert.Equal(t, http.StatusCreated, rr.Code)
	var envelope MCPRegisterEnvelope
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&envelope))
	assert.Equal(t, mcpRegisterMetadataError, envelope.Data.MetadataError)
	assert.Equal(t, []string{"team"}, envelope.Data.FailedTagKeys)
	mockClient.AssertExpectations(t)
}

func TestRegisterMCPServerValidation(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()
	app.config = config.EnvConfig{AuthMethod: config.AuthMethodDisabled}

	tests := []struct {
		name    string
		body    string
		wantMsg string
	}{
		{
			name:    "missing server_json",
			body:    `{"name":"` + testMCPServerName + `"}`,
			wantMsg: "server_json is required",
		},
		{
			name:    "mismatched server_json name",
			body:    `{"name":"` + testMCPServerName + `","server_json":{"name":"ct.example/other-server","version":"1.0.0"}}`,
			wantMsg: "must match server name",
		},
		{
			name:    "missing server_json version",
			body:    `{"name":"` + testMCPServerName + `","server_json":{"name":"` + testMCPServerName + `"}}`,
			wantMsg: `server_json "version" is required`,
		},
		{
			name:    "invalid server name",
			body:    `{"name":"not-a-namespaced-name","server_json":{"name":"not-a-namespaced-name","version":"1.0.0"}}`,
			wantMsg: `must be in "<namespace>/<slug>" format`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockClient := &mlflowpkg.MockClient{}
			req := httptest.NewRequest(http.MethodPost, "/api/v1/mcp-registry/register?workspace=my-ns", strings.NewReader(tt.body))
			req = requestWithMLflowClient(req, mockClient)
			req = withWorkspace(req, "my-ns")
			rr := httptest.NewRecorder()

			app.MLflowRegisterMCPServerHandler(rr, req, nil)

			assert.Equal(t, http.StatusBadRequest, rr.Code)
			var httpErr HTTPError
			require.NoError(t, json.NewDecoder(rr.Body).Decode(&httpErr))
			assert.Contains(t, httpErr.Error.Message, tt.wantMsg)
			mockClient.AssertNumberOfCalls(t, "CreateMCPServerVersion", 0)
		})
	}
}

func TestRegisterMCPServerMissingWorkspace(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()
	app.config = config.EnvConfig{AuthMethod: config.AuthMethodDisabled}
	mockClient := &mlflowpkg.MockClient{}

	body := fmt.Sprintf(`{"name":%q,"server_json":{"name":%q,"version":"1.0.0"}}`, testMCPServerName, testMCPServerName)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/mcp-registry/register", strings.NewReader(body))
	req = requestWithMLflowClient(req, mockClient)
	rr := httptest.NewRecorder()

	app.MLflowRegisterMCPServerHandler(rr, req, nil)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	var httpErr HTTPError
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&httpErr))
	assert.Equal(t, "workspace query parameter is required", httpErr.Error.Message)
	mockClient.AssertNumberOfCalls(t, "CreateMCPServerVersion", 0)
}

func TestRegisterMCPServerInvalidBody(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()
	app.config = config.EnvConfig{AuthMethod: config.AuthMethodDisabled}
	mockClient := &mlflowpkg.MockClient{}

	req := httptest.NewRequest(http.MethodPost, "/api/v1/mcp-registry/register?workspace=my-ns", strings.NewReader("not json"))
	req = requestWithMLflowClient(req, mockClient)
	req = withWorkspace(req, "my-ns")
	rr := httptest.NewRecorder()

	app.MLflowRegisterMCPServerHandler(rr, req, nil)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	var httpErr HTTPError
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&httpErr))
	assert.Contains(t, httpErr.Error.Message, "badly-formed JSON")
	mockClient.AssertNumberOfCalls(t, "CreateMCPServerVersion", 0)
}

func TestRegisterMCPServerClientError(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()
	app.config = config.EnvConfig{AuthMethod: config.AuthMethodDisabled}
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("CreateMCPServerVersion", tmock.Anything, testMCPServerName, tmock.Anything, tmock.Anything).
		Return((*mcpregistry.MCPServerVersion)(nil), fmt.Errorf("connection refused"))

	body := fmt.Sprintf(`{"name":%q,"server_json":{"name":%q,"version":"1.0.0"}}`, testMCPServerName, testMCPServerName)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/mcp-registry/register?workspace=my-ns", strings.NewReader(body))
	req = requestWithMLflowClient(req, mockClient)
	req = withWorkspace(req, "my-ns")
	rr := httptest.NewRecorder()

	app.MLflowRegisterMCPServerHandler(rr, req, nil)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	var httpErr HTTPError
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&httpErr))
	assert.Equal(t, "the server encountered a problem and could not process your request", httpErr.Error.Message)
	mockClient.AssertExpectations(t)
}

func TestDeleteMCPServerTagSuccess(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()
	app.config = config.EnvConfig{AuthMethod: config.AuthMethodDisabled}
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("DeleteMCPServerTag", tmock.Anything, testMCPServerName, "category").Return(nil)

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/mcp-registry/servers/"+testMCPServerName+"/tags/category?workspace=my-ns", nil)
	req = requestWithMLflowClient(req, mockClient)
	req = withWorkspace(req, "my-ns")
	rr := httptest.NewRecorder()

	app.MLflowMCPServerCatchAllDeleteHandler(rr, req, restParam("/"+testMCPServerName+"/tags/category"))

	assert.Equal(t, http.StatusNoContent, rr.Code)
	mockClient.AssertExpectations(t)
}

func TestDeleteMCPServerTagPathTraversalKey(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/mcp-registry/servers/"+testMCPServerName+"/tags/..", nil)
	req = requestWithMLflowClient(req, &mlflowpkg.MockClient{})
	rr := httptest.NewRecorder()

	app.MLflowMCPServerCatchAllDeleteHandler(rr, req, restParam("/"+testMCPServerName+"/tags/.."))

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

// --- MLflowMCPServerCatchAllPostHandler / GetHandler / DeleteHandler: aliases ---

func TestSetMCPServerAliasSuccess(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()
	app.config = config.EnvConfig{AuthMethod: config.AuthMethodDisabled}
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("SetMCPServerAlias", tmock.Anything, testMCPServerName, "production", "1.0.0").Return(nil)

	body := `{"alias":"production","version":"1.0.0"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/mcp-registry/servers/"+testMCPServerName+"/aliases?workspace=my-ns", strings.NewReader(body))
	req = requestWithMLflowClient(req, mockClient)
	req = withWorkspace(req, "my-ns")
	rr := httptest.NewRecorder()

	app.MLflowMCPServerCatchAllPostHandler(rr, req, restParam("/"+testMCPServerName+"/aliases"))

	assert.Equal(t, http.StatusNoContent, rr.Code)
	mockClient.AssertExpectations(t)
}

func TestSetMCPServerAliasMissingFields(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()

	body := `{"alias":"production"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/mcp-registry/servers/"+testMCPServerName+"/aliases", strings.NewReader(body))
	req = requestWithMLflowClient(req, &mlflowpkg.MockClient{})
	rr := httptest.NewRecorder()

	app.MLflowMCPServerCatchAllPostHandler(rr, req, restParam("/"+testMCPServerName+"/aliases"))

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestGetMCPServerVersionByAliasSuccess(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()
	mockClient := &mlflowpkg.MockClient{}

	now := time.Now()
	mockClient.On("GetMCPServerVersionByAlias", tmock.Anything, testMCPServerName, "production").
		Return(&mcpregistry.MCPServerVersion{Name: testMCPServerName, Version: "1.0.0", CreationTimestamp: now, LastUpdatedTimestamp: now}, nil)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/mcp-registry/servers/"+testMCPServerName+"/aliases/production?workspace=my-ns", nil)
	req = requestWithMLflowClient(req, mockClient)
	req = withWorkspace(req, "my-ns")
	rr := httptest.NewRecorder()

	app.MLflowMCPServerCatchAllGetHandler(rr, req, restParam("/"+testMCPServerName+"/aliases/production"))

	assert.Equal(t, http.StatusOK, rr.Code)
	var envelope MCPServerVersionEnvelope
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&envelope))
	assert.Equal(t, "1.0.0", envelope.Data.Version)
}

func TestDeleteMCPServerAliasSuccess(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()
	app.config = config.EnvConfig{AuthMethod: config.AuthMethodDisabled}
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("DeleteMCPServerAlias", tmock.Anything, testMCPServerName, "production").Return(nil)

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/mcp-registry/servers/"+testMCPServerName+"/aliases/production?workspace=my-ns", nil)
	req = requestWithMLflowClient(req, mockClient)
	req = withWorkspace(req, "my-ns")
	rr := httptest.NewRecorder()

	app.MLflowMCPServerCatchAllDeleteHandler(rr, req, restParam("/"+testMCPServerName+"/aliases/production"))

	assert.Equal(t, http.StatusNoContent, rr.Code)
	mockClient.AssertExpectations(t)
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
	serverJSON := map[string]any{"name": testMCPServerName, "version": "1.0.0"}
	mockClient.On("CreateMCPServerVersion", tmock.Anything, testMCPServerName, tmock.Anything, tmock.Anything).
		Return(&mcpregistry.MCPServerVersion{
			Name: testMCPServerName, Version: "1.0.0", ServerJSON: serverJSON,
			CreationTimestamp: now, LastUpdatedTimestamp: now,
		}, nil)

	body := fmt.Sprintf(`{"server_json":{"name":%q,"version":"1.0.0"}}`, testMCPServerName)
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

func TestCreateMCPServerVersionServerJSONNameMismatch(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()

	body := `{"server_json":{"name":"some.other/server","version":"1.0.0"}}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/mcp-registry/servers/"+testMCPServerName+"/versions", strings.NewReader(body))
	req = requestWithMLflowClient(req, &mlflowpkg.MockClient{})
	rr := httptest.NewRecorder()

	app.MLflowMCPServerCatchAllPostHandler(rr, req, restParam("/"+testMCPServerName+"/versions"))

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestCreateMCPServerVersionMissingVersion(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()

	body := fmt.Sprintf(`{"server_json":{"name":%q}}`, testMCPServerName)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/mcp-registry/servers/"+testMCPServerName+"/versions", strings.NewReader(body))
	req = requestWithMLflowClient(req, &mlflowpkg.MockClient{})
	rr := httptest.NewRecorder()

	app.MLflowMCPServerCatchAllPostHandler(rr, req, restParam("/"+testMCPServerName+"/versions"))

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

// --- MLflowMCPServerCatchAllGetHandler: GetMCPServerVersion ---

func TestGetMCPServerVersionSuccess(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()
	mockClient := &mlflowpkg.MockClient{}

	now := time.Now()
	mockClient.On("GetMCPServerVersion", tmock.Anything, testMCPServerName, "1.0.0").
		Return(&mcpregistry.MCPServerVersion{Name: testMCPServerName, Version: "1.0.0", CreationTimestamp: now, LastUpdatedTimestamp: now}, nil)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/mcp-registry/servers/"+testMCPServerName+"/versions/1.0.0?workspace=my-ns", nil)
	req = requestWithMLflowClient(req, mockClient)
	req = withWorkspace(req, "my-ns")
	rr := httptest.NewRecorder()

	app.MLflowMCPServerCatchAllGetHandler(rr, req, restParam("/"+testMCPServerName+"/versions/1.0.0"))

	assert.Equal(t, http.StatusOK, rr.Code)
	var envelope MCPServerVersionEnvelope
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&envelope))
	assert.Equal(t, "1.0.0", envelope.Data.Version)
}

func TestGetMCPServerVersionPathTraversal(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/mcp-registry/servers/"+testMCPServerName+"/versions/..", nil)
	req = requestWithMLflowClient(req, &mlflowpkg.MockClient{})
	rr := httptest.NewRecorder()

	app.MLflowMCPServerCatchAllGetHandler(rr, req, restParam("/"+testMCPServerName+"/versions/.."))

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

// --- MLflowMCPServerCatchAllPatchHandler: UpdateMCPServerVersion ---

func TestUpdateMCPServerVersionSuccess(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()
	app.config = config.EnvConfig{AuthMethod: config.AuthMethodDisabled}
	mockClient := &mlflowpkg.MockClient{}

	now := time.Now()
	mockClient.On("UpdateMCPServerVersion", tmock.Anything, testMCPServerName, "1.0.0", tmock.Anything).
		Return(&mcpregistry.MCPServerVersion{
			Name: testMCPServerName, Version: "1.0.0", Status: mcpregistry.MCPServerVersionStatusActive,
			CreationTimestamp: now, LastUpdatedTimestamp: now,
		}, nil)

	body := `{"status":"active"}`
	req := httptest.NewRequest(http.MethodPatch, "/api/v1/mcp-registry/servers/"+testMCPServerName+"/versions/1.0.0?workspace=my-ns", strings.NewReader(body))
	req = requestWithMLflowClient(req, mockClient)
	req = withWorkspace(req, "my-ns")
	rr := httptest.NewRecorder()

	app.MLflowMCPServerCatchAllPatchHandler(rr, req, restParam("/"+testMCPServerName+"/versions/1.0.0"))

	assert.Equal(t, http.StatusOK, rr.Code)
	var envelope MCPServerVersionEnvelope
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&envelope))
	assert.Equal(t, models.MCPServerVersionStatusActive, envelope.Data.Status)
	mockClient.AssertExpectations(t)
}

// --- MLflowMCPServerCatchAllDeleteHandler: DeleteMCPServerVersion ---

func TestDeleteMCPServerVersionSuccess(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()
	app.config = config.EnvConfig{AuthMethod: config.AuthMethodDisabled}
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("DeleteMCPServerVersion", tmock.Anything, testMCPServerName, "1.0.0").Return(nil)

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/mcp-registry/servers/"+testMCPServerName+"/versions/1.0.0?workspace=my-ns", nil)
	req = requestWithMLflowClient(req, mockClient)
	req = withWorkspace(req, "my-ns")
	rr := httptest.NewRecorder()

	app.MLflowMCPServerCatchAllDeleteHandler(rr, req, restParam("/"+testMCPServerName+"/versions/1.0.0"))

	assert.Equal(t, http.StatusNoContent, rr.Code)
	mockClient.AssertExpectations(t)
}

// --- MLflowMCPServerCatchAllPostHandler / DeleteHandler: version tags ---

func TestSetMCPServerVersionTagSuccess(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()
	app.config = config.EnvConfig{AuthMethod: config.AuthMethodDisabled}
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("SetMCPServerVersionTag", tmock.Anything, testMCPServerName, "1.0.0", "stability", "beta").Return(nil)

	body := `{"key":"stability","value":"beta"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/mcp-registry/servers/"+testMCPServerName+"/versions/1.0.0/tags?workspace=my-ns", strings.NewReader(body))
	req = requestWithMLflowClient(req, mockClient)
	req = withWorkspace(req, "my-ns")
	rr := httptest.NewRecorder()

	app.MLflowMCPServerCatchAllPostHandler(rr, req, restParam("/"+testMCPServerName+"/versions/1.0.0/tags"))

	assert.Equal(t, http.StatusOK, rr.Code)
	mockClient.AssertExpectations(t)
}

func TestDeleteMCPServerVersionTagSuccess(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()
	app.config = config.EnvConfig{AuthMethod: config.AuthMethodDisabled}
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("DeleteMCPServerVersionTag", tmock.Anything, testMCPServerName, "1.0.0", "stability").Return(nil)

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/mcp-registry/servers/"+testMCPServerName+"/versions/1.0.0/tags/stability?workspace=my-ns", nil)
	req = requestWithMLflowClient(req, mockClient)
	req = withWorkspace(req, "my-ns")
	rr := httptest.NewRecorder()

	app.MLflowMCPServerCatchAllDeleteHandler(rr, req, restParam("/"+testMCPServerName+"/versions/1.0.0/tags/stability"))

	assert.Equal(t, http.StatusNoContent, rr.Code)
	mockClient.AssertExpectations(t)
}

func TestDeleteMCPServerVersionTagPathTraversalKey(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/mcp-registry/servers/"+testMCPServerName+"/versions/1.0.0/tags/..", nil)
	req = requestWithMLflowClient(req, &mlflowpkg.MockClient{})
	rr := httptest.NewRecorder()

	app.MLflowMCPServerCatchAllDeleteHandler(rr, req, restParam("/"+testMCPServerName+"/versions/1.0.0/tags/.."))

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

// --- MLflowMCPServerCatchAllGetHandler: GetMCPAccessEndpoint ---

func TestGetMCPAccessEndpointSuccess(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()
	mockClient := &mlflowpkg.MockClient{}

	now := time.Now()
	mockClient.On("GetMCPAccessEndpoint", tmock.Anything, testMCPServerName, "ep-1").
		Return(&mcpregistry.MCPAccessEndpoint{ID: "ep-1", ServerName: testMCPServerName, CreationTimestamp: now, LastUpdatedTimestamp: now}, nil)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/mcp-registry/servers/"+testMCPServerName+"/endpoints/ep-1?workspace=my-ns", nil)
	req = requestWithMLflowClient(req, mockClient)
	req = withWorkspace(req, "my-ns")
	rr := httptest.NewRecorder()

	app.MLflowMCPServerCatchAllGetHandler(rr, req, restParam("/"+testMCPServerName+"/endpoints/ep-1"))

	assert.Equal(t, http.StatusOK, rr.Code)
	var envelope MCPAccessEndpointEnvelope
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&envelope))
	assert.Equal(t, "ep-1", envelope.Data.ID)
}

func TestGetMCPAccessEndpointPathTraversalID(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/mcp-registry/servers/"+testMCPServerName+"/endpoints/..", nil)
	req = requestWithMLflowClient(req, &mlflowpkg.MockClient{})
	rr := httptest.NewRecorder()

	app.MLflowMCPServerCatchAllGetHandler(rr, req, restParam("/"+testMCPServerName+"/endpoints/.."))

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

// --- MLflowMCPServerCatchAllPatchHandler: UpdateMCPAccessEndpoint ---

func TestUpdateMCPAccessEndpointSuccess(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()
	app.config = config.EnvConfig{AuthMethod: config.AuthMethodDisabled}
	mockClient := &mlflowpkg.MockClient{}

	now := time.Now()
	mockClient.On("UpdateMCPAccessEndpoint", tmock.Anything, testMCPServerName, "ep-1", tmock.Anything).
		Return(&mcpregistry.MCPAccessEndpoint{
			ID: "ep-1", ServerName: testMCPServerName, EndpointURL: "https://mcp.example.com/new",
			CreationTimestamp: now, LastUpdatedTimestamp: now,
		}, nil)

	body := `{"endpoint_url":"https://mcp.example.com/new"}`
	req := httptest.NewRequest(http.MethodPatch, "/api/v1/mcp-registry/servers/"+testMCPServerName+"/endpoints/ep-1?workspace=my-ns", strings.NewReader(body))
	req = requestWithMLflowClient(req, mockClient)
	req = withWorkspace(req, "my-ns")
	rr := httptest.NewRecorder()

	app.MLflowMCPServerCatchAllPatchHandler(rr, req, restParam("/"+testMCPServerName+"/endpoints/ep-1"))

	assert.Equal(t, http.StatusOK, rr.Code)
	var envelope MCPAccessEndpointEnvelope
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&envelope))
	assert.Equal(t, "https://mcp.example.com/new", envelope.Data.EndpointURL)
	mockClient.AssertExpectations(t)
}

func TestUpdateMCPAccessEndpointInvalidURL(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()

	body := `{"endpoint_url":"http://localhost/x"}`
	req := httptest.NewRequest(http.MethodPatch, "/api/v1/mcp-registry/servers/"+testMCPServerName+"/endpoints/ep-1", strings.NewReader(body))
	req = requestWithMLflowClient(req, &mlflowpkg.MockClient{})
	rr := httptest.NewRecorder()

	app.MLflowMCPServerCatchAllPatchHandler(rr, req, restParam("/"+testMCPServerName+"/endpoints/ep-1"))

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestUpdateMCPAccessEndpointMutuallyExclusiveFields(t *testing.T) {
	app := newTestAppWithMCPRegistryRepos()

	body := `{"server_version":"1.0.0","server_alias":"latest"}`
	req := httptest.NewRequest(http.MethodPatch, "/api/v1/mcp-registry/servers/"+testMCPServerName+"/endpoints/ep-1", strings.NewReader(body))
	req = requestWithMLflowClient(req, &mlflowpkg.MockClient{})
	rr := httptest.NewRecorder()

	app.MLflowMCPServerCatchAllPatchHandler(rr, req, restParam("/"+testMCPServerName+"/endpoints/ep-1"))

	assert.Equal(t, http.StatusBadRequest, rr.Code)
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
			body:     fmt.Sprintf(`{"server_json":{"name":%q,"version":"1.0.0"}}`, testMCPServerName),
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
			body:     fmt.Sprintf(`{"server_json":{"name":%q,"version":"1.0.0"}}`, testMCPServerName),
			rest:     "/" + testMCPServerName + "/versions",

			wantStatus: http.StatusCreated,
			setupMock: func(m *mlflowpkg.MockClient) {
				now := time.Now()
				m.On("CreateMCPServerVersion", tmock.Anything, testMCPServerName, tmock.Anything, tmock.Anything).
					Return(&mcpregistry.MCPServerVersion{Name: testMCPServerName, Version: "1.0.0", CreationTimestamp: now, LastUpdatedTimestamp: now}, nil)
			},
		},
		{
			name:            "RegisterMCPServer forbidden without permission",
			handler:         "register",
			verb:            "create",
			canWrite:        false,
			method:          http.MethodPost,
			path:            "/api/v1/mcp-registry/register?workspace=my-ns",
			body:            fmt.Sprintf(`{"name":%q,"server_json":{"name":%q,"version":"1.0.0"}}`, testMCPServerName, testMCPServerName),
			wantStatus:      http.StatusForbidden,
			assertNotCalled: "CreateMCPServerVersion",
		},
		{
			name:       "RegisterMCPServer success with permission",
			handler:    "register",
			verb:       "create",
			canWrite:   true,
			method:     http.MethodPost,
			path:       "/api/v1/mcp-registry/register?workspace=my-ns",
			body:       fmt.Sprintf(`{"name":%q,"server_json":{"name":%q,"version":"1.0.0"}}`, testMCPServerName, testMCPServerName),
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
			name:            "UpdateMCPServer forbidden without permission",
			handler:         "updateServer",
			verb:            "update",
			canWrite:        false,
			method:          http.MethodPatch,
			path:            "/api/v1/mcp-registry/servers/" + testMCPServerName + "?workspace=my-ns",
			body:            `{"display_name":"New Name"}`,
			rest:            "/" + testMCPServerName,
			wantStatus:      http.StatusForbidden,
			assertNotCalled: "UpdateMCPServer",
		},
		{
			name:       "UpdateMCPServer success with permission",
			handler:    "updateServer",
			verb:       "update",
			canWrite:   true,
			method:     http.MethodPatch,
			path:       "/api/v1/mcp-registry/servers/" + testMCPServerName + "?workspace=my-ns",
			body:       `{"display_name":"New Name"}`,
			rest:       "/" + testMCPServerName,
			wantStatus: http.StatusOK,
			setupMock: func(m *mlflowpkg.MockClient) {
				now := time.Now()
				m.On("UpdateMCPServer", tmock.Anything, testMCPServerName, tmock.Anything).
					Return(&mcpregistry.MCPServer{Name: testMCPServerName, CreationTimestamp: now, LastUpdatedTimestamp: now}, nil)
			},
		},
		{
			name:            "DeleteMCPServer forbidden without permission",
			handler:         "deleteServer",
			verb:            "delete",
			canWrite:        false,
			method:          http.MethodDelete,
			path:            "/api/v1/mcp-registry/servers/" + testMCPServerName + "?workspace=my-ns",
			rest:            "/" + testMCPServerName,
			wantStatus:      http.StatusForbidden,
			assertNotCalled: "DeleteMCPServer",
		},
		{
			name:       "DeleteMCPServer success with permission",
			handler:    "deleteServer",
			verb:       "delete",
			canWrite:   true,
			method:     http.MethodDelete,
			path:       "/api/v1/mcp-registry/servers/" + testMCPServerName + "?workspace=my-ns",
			rest:       "/" + testMCPServerName,
			wantStatus: http.StatusNoContent,
			setupMock: func(m *mlflowpkg.MockClient) {
				m.On("DeleteMCPServer", tmock.Anything, testMCPServerName).Return(nil)
			},
		},
		{
			name:            "SetMCPServerTag forbidden without permission",
			handler:         "setServerTag",
			verb:            "update",
			canWrite:        false,
			method:          http.MethodPost,
			path:            "/api/v1/mcp-registry/servers/" + testMCPServerName + "/tags?workspace=my-ns",
			body:            `{"key":"category","value":"weather"}`,
			rest:            "/" + testMCPServerName + "/tags",
			wantStatus:      http.StatusForbidden,
			assertNotCalled: "SetMCPServerTag",
		},
		{
			name:       "SetMCPServerTag success with permission",
			handler:    "setServerTag",
			verb:       "update",
			canWrite:   true,
			method:     http.MethodPost,
			path:       "/api/v1/mcp-registry/servers/" + testMCPServerName + "/tags?workspace=my-ns",
			body:       `{"key":"category","value":"weather"}`,
			rest:       "/" + testMCPServerName + "/tags",
			wantStatus: http.StatusOK,
			setupMock: func(m *mlflowpkg.MockClient) {
				m.On("SetMCPServerTag", tmock.Anything, testMCPServerName, "category", "weather").Return(nil)
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
			name:            "RegisterMCPServer permission check error",
			handler:         "register",
			verb:            "create",
			permissionError: true,
			method:          http.MethodPost,
			path:            "/api/v1/mcp-registry/register?workspace=my-ns",
			body:            fmt.Sprintf(`{"name":%q,"server_json":{"name":%q,"version":"1.0.0"}}`, testMCPServerName, testMCPServerName),
			wantStatus:      http.StatusInternalServerError,
			assertNotCalled: "CreateMCPServerVersion",
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
			case "register":
				app.MLflowRegisterMCPServerHandler(rr, req, nil)
			case "createVersion":
				app.MLflowMCPServerCatchAllPostHandler(rr, req, restParam(tt.rest))
			case "createEndpoint":
				app.MLflowMCPServerCatchAllPostHandler(rr, req, restParam(tt.rest))
			case "deleteEndpoint":
				app.MLflowMCPServerCatchAllDeleteHandler(rr, req, restParam(tt.rest))
			case "updateServer":
				app.MLflowMCPServerCatchAllPatchHandler(rr, req, restParam(tt.rest))
			case "deleteServer":
				app.MLflowMCPServerCatchAllDeleteHandler(rr, req, restParam(tt.rest))
			case "setServerTag":
				app.MLflowMCPServerCatchAllPostHandler(rr, req, restParam(tt.rest))
			default:
				t.Fatalf("unknown handler %q in test table", tt.handler)
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

func TestMCPWritePermissionIsIndependentOfPromptsPermission(t *testing.T) {
	t.Run("prompts allowed, MCP servers forbidden", func(t *testing.T) {
		factory := k8mocks.NewSimpleMockFactoryWithSeparatePermissions(true, false, "create", "my-ns")
		app := &App{
			config:                  config.EnvConfig{AuthMethod: config.AuthMethodUser},
			logger:                  testLogger(),
			kubernetesClientFactory: factory,
		}
		req := httptest.NewRequest(http.MethodPost, "/", nil)
		req = withIdentityToken(req, "test-token")
		rr := httptest.NewRecorder()

		result := app.enforceMCPWritePermission(req.Context(), rr, req, "my-ns", "create")

		assert.False(t, result)
		assert.Equal(t, http.StatusForbidden, rr.Code)
	})

	t.Run("MCP servers allowed, prompts forbidden", func(t *testing.T) {
		factory := k8mocks.NewSimpleMockFactoryWithSeparatePermissions(false, true, "create", "my-ns")
		app := &App{
			config:                  config.EnvConfig{AuthMethod: config.AuthMethodUser},
			logger:                  testLogger(),
			kubernetesClientFactory: factory,
		}
		req := httptest.NewRequest(http.MethodPost, "/", nil)
		req = withIdentityToken(req, "test-token")
		rr := httptest.NewRecorder()

		result := app.enforceMCPWritePermission(req.Context(), rr, req, "my-ns", "create")

		assert.True(t, result)
	})
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
