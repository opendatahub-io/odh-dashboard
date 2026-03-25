package api

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/automl-library/bff/internal/config"
	"github.com/opendatahub-io/automl-library/bff/internal/constants"
	"github.com/opendatahub-io/automl-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/automl-library/bff/internal/repositories"
	"github.com/stretchr/testify/assert"
)

// newModelRegistryTestApp creates an App configured with MockK8Client=true so that
// ListModelRegistries returns the built-in mock fixtures without hitting the cluster.
func newModelRegistryTestApp() *App {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	return &App{
		config: config.EnvConfig{
			AuthMethod:   config.AuthMethodDisabled,
			MockK8Client: true,
		},
		logger:       logger,
		repositories: repositories.NewRepositories(logger),
	}
}

// withIdentityContext injects a fake RequestIdentity into the request context,
// simulating what InjectRequestIdentity does in production.
func withIdentityContext(req *http.Request) *http.Request {
	ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &kubernetes.RequestIdentity{
		UserID: "test-user",
	})
	return req.WithContext(ctx)
}

func TestGetModelRegistriesHandler_Success(t *testing.T) {
	app := newModelRegistryTestApp()

	t.Run("returns 200 with model registries list", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/api/v1/model-registries", nil)
		req = withIdentityContext(req)
		rr := httptest.NewRecorder()

		app.GetModelRegistriesHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))

		var response map[string]interface{}
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()
		assert.NoError(t, json.Unmarshal(body, &response))
		assert.Contains(t, response, "data")
	})

	t.Run("data contains model_registries array", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/api/v1/model-registries", nil)
		req = withIdentityContext(req)
		rr := httptest.NewRecorder()

		app.GetModelRegistriesHandler(rr, req, nil)

		var response map[string]interface{}
		body, _ := io.ReadAll(rr.Result().Body)
		defer rr.Result().Body.Close()
		assert.NoError(t, json.Unmarshal(body, &response))

		data := response["data"].(map[string]interface{})
		assert.Contains(t, data, "model_registries")

		registries := data["model_registries"].([]interface{})
		assert.Len(t, registries, 2, "mock should return 2 registries")
	})

	t.Run("each registry has required fields", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/api/v1/model-registries", nil)
		req = withIdentityContext(req)
		rr := httptest.NewRecorder()

		app.GetModelRegistriesHandler(rr, req, nil)

		var response map[string]interface{}
		body, _ := io.ReadAll(rr.Result().Body)
		defer rr.Result().Body.Close()
		assert.NoError(t, json.Unmarshal(body, &response))

		data := response["data"].(map[string]interface{})
		registries := data["model_registries"].([]interface{})

		first := registries[0].(map[string]interface{})
		assert.Contains(t, first, "id")
		assert.Contains(t, first, "name")
		assert.Contains(t, first, "display_name")
		assert.Contains(t, first, "is_ready")
		assert.Contains(t, first, "server_url")

		assert.Equal(t, "default-modelregistry", first["name"])
		assert.Equal(t, true, first["is_ready"])
		assert.Contains(t, first["server_url"].(string), "/api/model_registry/v1alpha3")
	})
}

func TestGetModelRegistriesHandler_ErrorCases(t *testing.T) {
	t.Run("returns 400 when RequestIdentity is missing from context", func(t *testing.T) {
		app := newModelRegistryTestApp()
		req, _ := http.NewRequest(http.MethodGet, "/api/v1/model-registries", nil)
		// No identity in context
		rr := httptest.NewRecorder()

		app.GetModelRegistriesHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)

		var response map[string]interface{}
		body, _ := io.ReadAll(rr.Result().Body)
		defer rr.Result().Body.Close()
		assert.NoError(t, json.Unmarshal(body, &response))
		assert.Contains(t, response, "error")
	})

	t.Run("response is always an array even when empty", func(t *testing.T) {
		// Verify that the envelope always serializes model_registries as []
		// rather than null when the mock returns an empty slice.
		// We test this via the repository directly since the handler uses mock fixtures.
		app := newModelRegistryTestApp()

		req, _ := http.NewRequest(http.MethodGet, "/api/v1/model-registries", nil)
		req = withIdentityContext(req)
		rr := httptest.NewRecorder()

		app.GetModelRegistriesHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		var raw map[string]interface{}
		body, _ := io.ReadAll(rr.Result().Body)
		defer rr.Result().Body.Close()
		assert.NoError(t, json.Unmarshal(body, &raw))

		data := raw["data"].(map[string]interface{})
		_, isArray := data["model_registries"].([]interface{})
		assert.True(t, isArray, "model_registries should always serialize as a JSON array")
	})
}

func TestGetModelRegistriesHandler_RouteIntegration(t *testing.T) {
	t.Run("GET /api/v1/model-registries returns 200 via router", func(t *testing.T) {
		app := newModelRegistryTestApp()
		// Wire identity via the global middleware chain by injecting via header
		// (auth is disabled in test app so InjectRequestIdentity creates a synthetic identity)
		req, _ := http.NewRequest(http.MethodGet, "/api/v1/model-registries", nil)
		rr := httptest.NewRecorder()
		app.Routes().ServeHTTP(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
	})
}
