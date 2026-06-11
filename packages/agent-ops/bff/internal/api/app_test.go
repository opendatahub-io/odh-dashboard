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
