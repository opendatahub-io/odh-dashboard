package api

import (
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func requireTestOpenAPIHandler(t *testing.T) *OpenAPIHandler {
	t.Helper()

	originalWd, err := os.Getwd()
	require.NoError(t, err)

	projectRoot := filepath.Join(originalWd, "..", "..")
	require.NoError(t, os.Chdir(projectRoot))
	t.Cleanup(func() {
		assert.NoError(t, os.Chdir(originalWd))
	})

	handler, err := NewOpenAPIHandler(slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{Level: slog.LevelError})))
	require.NoError(t, err)
	return handler
}

func testRoutesApp(t *testing.T) *App {
	t.Helper()
	return NewTestApp(
		config.EnvConfig{
			AuthMethod:      config.AuthMethodDisabled,
			StaticAssetsDir: t.TempDir(),
		},
		testAppLogger(),
		nil,
		testRepositoriesWithAgents(),
		WithOpenAPIHandler(requireTestOpenAPIHandler(t)),
	)
}

func TestOpenAPIRoutes_Served(t *testing.T) {
	app := testRoutesApp(t)
	handler := app.Routes()

	t.Run("openapi json", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, OpenAPIJSONPath, nil)
		handler.ServeHTTP(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Contains(t, rr.Header().Get("Content-Type"), "application/json")
		assert.Contains(t, rr.Body.String(), `"openapi"`)
	})

	t.Run("openapi json concurrent", func(t *testing.T) {
		const requests = 10
		var wg sync.WaitGroup
		wg.Add(requests)
		for range requests {
			go func() {
				defer wg.Done()
				rr := httptest.NewRecorder()
				req := httptest.NewRequest(http.MethodGet, OpenAPIJSONPath, nil)
				handler.ServeHTTP(rr, req)
				assert.Equal(t, http.StatusOK, rr.Code)
			}()
		}
		wg.Wait()
	})

	t.Run("openapi yaml", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, OpenAPIYAMLPath, nil)
		handler.ServeHTTP(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Contains(t, rr.Header().Get("Content-Type"), "text/yaml")
		assert.Contains(t, rr.Body.String(), "openapi:")
	})

	t.Run("swagger ui", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, SwaggerUIPath, nil)
		handler.ServeHTTP(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Contains(t, rr.Header().Get("Content-Type"), "text/html")
		assert.Contains(t, rr.Body.String(), "swagger-ui")
		assert.Contains(t, rr.Body.String(), "/mod-arch/openapi.json")
	})

	t.Run("openapi redirect", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, OpenAPIPath, nil)
		handler.ServeHTTP(rr, req)

		assert.Equal(t, http.StatusMovedPermanently, rr.Code)
		assert.Equal(t, SwaggerUIPath, rr.Header().Get("Location"))
	})
}

func TestNewOpenAPIHandler_LoadsSpec(t *testing.T) {
	handler := requireTestOpenAPIHandler(t)
	require.NotNil(t, handler.spec)
	assert.True(t, strings.Contains(string(handler.specYAML), "Agent Ops REST API"))
}

func TestNewOpenAPIHandler_SpecNotFound(t *testing.T) {
	originalWd, err := os.Getwd()
	require.NoError(t, err)

	tempDir := t.TempDir()
	require.NoError(t, os.Chdir(tempDir))
	t.Cleanup(func() {
		require.NoError(t, os.Chdir(originalWd))
	})

	_, err = NewOpenAPIHandler(slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{Level: slog.LevelError})))
	require.Error(t, err)
	assert.Contains(t, err.Error(), "reading OpenAPI spec")
}
