package api

import (
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/config"
	"github.com/stretchr/testify/assert"
)

func testAppLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{Level: slog.LevelError}))
}

func testRoutesApp(t *testing.T, agentBackendAvailable bool) *App {
	t.Helper()
	app := &App{
		config: config.EnvConfig{
			AuthMethod:      config.AuthMethodDisabled,
			StaticAssetsDir: t.TempDir(),
		},
		logger:                  testAppLogger(),
		repositories:            testRepositoriesWithAgents(),
		agentBackendAvailable:   agentBackendAvailable,
	}
	return app
}

func TestAgentRoutes_MockAgentClientGating(t *testing.T) {
	t.Run("mock agent client enabled registers agent routes", func(t *testing.T) {
		app := testRoutesApp(t, true)

		rr := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, AgentRuntimesPath, nil)
		app.Routes().ServeHTTP(rr, req)
		assert.Equal(t, http.StatusOK, rr.Code)
	})

	t.Run("mock agent client disabled returns not found for agent routes", func(t *testing.T) {
		app := testRoutesApp(t, false)

		rr := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, AgentRuntimesPath, nil)
		app.Routes().ServeHTTP(rr, req)
		assert.Equal(t, http.StatusNotFound, rr.Code)
	})
}
