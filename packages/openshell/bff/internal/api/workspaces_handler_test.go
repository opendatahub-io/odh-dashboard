package api

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/config"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/mocks"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/models"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/repositories"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newMockApp() *App {
	return &App{
		config:         config.EnvConfig{AuthMethod: config.AuthMethodDisabled, MockHTTPClient: true},
		openshellStore: mocks.NewOpenShellStore(),
	}
}

func serveMock(t *testing.T, method, url string) (*http.Response, []byte) {
	req := httptest.NewRequest(method, url, http.NoBody)
	rr := httptest.NewRecorder()
	newMockApp().Routes().ServeHTTP(rr, req)
	res := rr.Result()
	body, err := io.ReadAll(res.Body)
	require.NoError(t, err)
	res.Body.Close()
	return res, body
}

func TestListWorkspacesHandler(t *testing.T) {
	res, body := serveMock(t, http.MethodGet, WorkspacesPath)
	require.Equal(t, http.StatusOK, res.StatusCode)

	var workspaces []models.Workspace
	require.NoError(t, json.Unmarshal(body, &workspaces))
	assert.Len(t, workspaces, 3)
	assert.Equal(t, "default", workspaces[0].Metadata.Name)
}

func TestListWorkspacesHandlerEmptyFixture(t *testing.T) {
	res, body := serveMock(t, http.MethodGet, WorkspacesPath+"?labelSelector=openshell.mock/empty")
	require.Equal(t, http.StatusOK, res.StatusCode)

	var workspaces []models.Workspace
	require.NoError(t, json.Unmarshal(body, &workspaces))
	assert.Empty(t, workspaces)
}

func TestGetWorkspaceHandler(t *testing.T) {
	res, body := serveMock(t, http.MethodGet, ApiPathPrefix+"/workspaces/dev-team")
	require.Equal(t, http.StatusOK, res.StatusCode)

	var workspace models.Workspace
	require.NoError(t, json.Unmarshal(body, &workspace))
	assert.Equal(t, "dev-team", workspace.Metadata.Name)
	assert.Equal(t, models.WorkspacePhaseActive, workspace.Phase)
}

func TestGetWorkspaceHandlerNotFound(t *testing.T) {
	res, _ := serveMock(t, http.MethodGet, ApiPathPrefix+"/workspaces/missing")
	assert.Equal(t, http.StatusNotFound, res.StatusCode)
}

func TestListSandboxesHandler(t *testing.T) {
	res, body := serveMock(t, http.MethodGet, ApiPathPrefix+"/workspaces/default/sandboxes")
	require.Equal(t, http.StatusOK, res.StatusCode)

	var sandboxes []models.Sandbox
	require.NoError(t, json.Unmarshal(body, &sandboxes))
	assert.Len(t, sandboxes, 2)
}

func TestGetSandboxHandler(t *testing.T) {
	res, body := serveMock(t, http.MethodGet, ApiPathPrefix+"/workspaces/default/sandboxes/my-agent")
	require.Equal(t, http.StatusOK, res.StatusCode)

	var sandbox models.Sandbox
	require.NoError(t, json.Unmarshal(body, &sandbox))
	assert.Equal(t, "my-agent", sandbox.Metadata.Name)
	assert.Equal(t, models.SandboxPhaseReady, sandbox.Status.Phase)
}

func TestReadyzHandler(t *testing.T) {
	res, body := serveMock(t, http.MethodGet, HealthReadyPath)
	require.Equal(t, http.StatusOK, res.StatusCode)
	assert.Contains(t, string(body), `"status": "ok"`)
}

func TestHealthcheckHandler(t *testing.T) {
	app := newMockApp()
	app.repositories = repositories.NewRepositories()
	res, body := serveApp(t, app, http.MethodGet, HealthCheckPath)
	require.Equal(t, http.StatusOK, res.StatusCode)
	assert.Contains(t, string(body), `"status": "available"`)
}

func serveApp(t *testing.T, app *App, method, url string) (*http.Response, []byte) {
	req := httptest.NewRequest(method, url, http.NoBody)
	rr := httptest.NewRecorder()
	app.Routes().ServeHTTP(rr, req)
	res := rr.Result()
	body, err := io.ReadAll(res.Body)
	require.NoError(t, err)
	res.Body.Close()
	return res, body
}
