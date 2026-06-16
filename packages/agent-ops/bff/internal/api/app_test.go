package api

import (
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/config"
	k8s "github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/kubernetes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func testAppLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{Level: slog.LevelError}))
}

func testRoutesApp(t *testing.T) *App {
	t.Helper()
	return &App{
		config: config.EnvConfig{
			AuthMethod:      config.AuthMethodDisabled,
			StaticAssetsDir: t.TempDir(),
		},
		logger:       testAppLogger(),
		repositories: testRepositoriesWithAgents(),
	}
}

func TestAgentRoutes_Registered(t *testing.T) {
	app := testRoutesApp(t)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, AgentRuntimesPath, nil)
	app.Routes().ServeHTTP(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestAgentRuntimeDetailRoute_Registered(t *testing.T) {
	app := testRoutesApp(t)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/agents/runtimes/agent-ops-demo/sample-support-agent", nil)
	app.Routes().ServeHTTP(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestNewApp_AuthDisabledRequiresMockAgentClient(t *testing.T) {
	_, err := NewApp(config.EnvConfig{
		AuthMethod:      config.AuthMethodDisabled,
		MockAgentClient: false,
	}, testAppLogger())
	require.Error(t, err)
	assert.Contains(t, err.Error(), "MOCK_AGENT_CLIENT")
}

func TestInjectRequestIdentity_UnauthorizedWithoutToken(t *testing.T) {
	app := &App{
		config: config.EnvConfig{
			AuthMethod:      config.AuthMethodUser,
			AuthTokenHeader: "Authorization",
			AuthTokenPrefix: "Bearer ",
		},
		logger:                  testAppLogger(),
		kubernetesClientFactory: k8s.NewTokenClientFactory(testAppLogger(), config.EnvConfig{AuthTokenHeader: "Authorization", AuthTokenPrefix: "Bearer "}),
	}

	called := false
	handler := app.InjectRequestIdentity(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		called = true
	}))

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, AgentRuntimesPath, nil)
	handler.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusUnauthorized, rr.Code)
	assert.False(t, called)
}
