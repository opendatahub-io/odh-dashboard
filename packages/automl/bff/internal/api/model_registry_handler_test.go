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

// injectModelRegistryTestIdentity injects a fake RequestIdentity into the request context,
// simulating what InjectRequestIdentity does in production.
func injectModelRegistryTestIdentity(req *http.Request) *http.Request {
	ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &kubernetes.RequestIdentity{
		UserID: "test-user",
	})
	return req.WithContext(ctx)
}

func TestGetModelRegistriesHandler_Success(t *testing.T) {
	app := newModelRegistryTestApp()

	t.Run("returns 200 with model registries list", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/api/v1/model-registries", nil)
		req = injectModelRegistryTestIdentity(req)
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
		req = injectModelRegistryTestIdentity(req)
		rr := httptest.NewRecorder()

		app.GetModelRegistriesHandler(rr, req, nil)

		var response map[string]interface{}
		body, _ := io.ReadAll(rr.Result().Body)
		defer rr.Result().Body.Close()
		assert.NoError(t, json.Unmarshal(body, &response))

		data, ok := response["data"].(map[string]interface{})
		assert.True(t, ok, "data should be a map")
		if !ok {
			return
		}
		assert.Contains(t, data, "model_registries")

		registries, ok := data["model_registries"].([]interface{})
		assert.True(t, ok, "model_registries should be an array")
		if !ok {
			return
		}
		assert.Len(t, registries, 2, "mock should return 2 registries")
	})

	t.Run("each registry has required fields", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/api/v1/model-registries", nil)
		req = injectModelRegistryTestIdentity(req)
		rr := httptest.NewRecorder()

		app.GetModelRegistriesHandler(rr, req, nil)

		var response map[string]interface{}
		body, _ := io.ReadAll(rr.Result().Body)
		defer rr.Result().Body.Close()
		assert.NoError(t, json.Unmarshal(body, &response))

		data, ok := response["data"].(map[string]interface{})
		assert.True(t, ok, "data should be a map")
		if !ok {
			return
		}
		registries, ok := data["model_registries"].([]interface{})
		assert.True(t, ok, "model_registries should be an array")
		if !ok || len(registries) == 0 {
			return
		}

		first, ok := registries[0].(map[string]interface{})
		assert.True(t, ok, "registry entry should be a map")
		if !ok {
			return
		}
		assert.Contains(t, first, "id")
		assert.Contains(t, first, "name")
		assert.Contains(t, first, "display_name")
		assert.Contains(t, first, "is_ready")
		assert.Contains(t, first, "server_url")

		assert.Equal(t, "default-modelregistry", first["name"])
		assert.Equal(t, true, first["is_ready"])
		assert.Contains(t, first["server_url"].(string), "/api/model_registry/v1alpha3")
	})

	t.Run("display_name is always present in response", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/api/v1/model-registries", nil)
		req = injectModelRegistryTestIdentity(req)
		rr := httptest.NewRecorder()

		app.GetModelRegistriesHandler(rr, req, nil)

		var response map[string]interface{}
		body, _ := io.ReadAll(rr.Result().Body)
		defer rr.Result().Body.Close()
		assert.NoError(t, json.Unmarshal(body, &response))

		data, ok := response["data"].(map[string]interface{})
		assert.True(t, ok, "data should be a map")
		if !ok {
			return
		}
		regs, ok := data["model_registries"].([]interface{})
		assert.True(t, ok, "model_registries should be an array")
		if !ok {
			return
		}
		for _, reg := range regs {
			r, ok := reg.(map[string]interface{})
			assert.True(t, ok, "registry entry should be a map")
			if !ok {
				continue
			}
			displayName, ok := r["display_name"].(string)
			assert.True(t, ok, "display_name should be a string")
			assert.NotEmpty(t, displayName, "display_name should never be empty")
		}
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

	t.Run("model_registries serializes as array not null", func(t *testing.T) {
		// Verify that model_registries is always a JSON array [] not null.
		// This matters when the list is empty — Go nil slices serialize as null
		// without the explicit initialization in getMockModelRegistries / ListModelRegistries.
		app := newModelRegistryTestApp()

		req, _ := http.NewRequest(http.MethodGet, "/api/v1/model-registries", nil)
		req = injectModelRegistryTestIdentity(req)
		rr := httptest.NewRecorder()

		app.GetModelRegistriesHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		// Verify the raw JSON contains [] not null
		body, _ := io.ReadAll(rr.Result().Body)
		defer rr.Result().Body.Close()
		// Verify the raw JSON contains an array (not null) for model_registries.
		// The exact formatting (spaces, newlines) may vary so we parse rather than string-match.
		var raw map[string]interface{}
		assert.NoError(t, json.Unmarshal(body, &raw))
		data, ok := raw["data"].(map[string]interface{})
		assert.True(t, ok, "data should be a map")
		if !ok {
			return
		}
		_, isSlice := data["model_registries"].([]interface{})
		assert.True(t, isSlice, "model_registries must be a JSON array, not null")
	})
}

func TestGetModelRegistriesHandler_RouteIntegration(t *testing.T) {
	t.Run("GET /api/v1/model-registries returns 200 via router", func(t *testing.T) {
		app := newModelRegistryTestApp()
		// auth is disabled in test app so InjectRequestIdentity creates a synthetic identity
		req, _ := http.NewRequest(http.MethodGet, "/api/v1/model-registries", nil)
		rr := httptest.NewRecorder()
		app.Routes().ServeHTTP(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
	})
}
