package api

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/autorag-library/bff/internal/config"
	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/ogx/ogxmocks"
	"github.com/opendatahub-io/autorag-library/bff/internal/repositories"
	corek8s "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
	corek8smocks "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes/mocks"
	"github.com/stretchr/testify/assert"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func TestOGXVectorStoresHandler_Success(t *testing.T) {
	app := newOGXHandlerTestApp(t)

	t.Run("should return vector_io providers only", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodGet, "/api/v1/ogx/vector-stores?namespace=test-namespace&secretName=test-secret", nil)
		assert.NoError(t, err)
		ctx := context.WithValue(req.Context(), constants.NamespaceHeaderParameterKey, "test-namespace")
		req = req.WithContext(ctx)

		app.OGXVectorStoresHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))

		var response map[string]interface{}
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()
		assert.NoError(t, json.Unmarshal(body, &response))

		assert.Contains(t, response, "data")
		data := response["data"].(map[string]interface{})
		assert.Contains(t, data, "vector_store_providers")

		providers := data["vector_store_providers"].([]interface{})
		// Mock returns 3 providers total: 2 vector_io + 1 inference. Only vector_io should be returned.
		assert.Len(t, providers, 2, "Should return only the 2 vector_io providers from mock")
	})

	t.Run("should have correct stable API provider structure", func(t *testing.T) {
		rr, req := newHandlerTestRequest(t, app)
		app.OGXVectorStoresHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		var response map[string]interface{}
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()
		assert.NoError(t, json.Unmarshal(body, &response))

		data := response["data"].(map[string]interface{})
		providers := data["vector_store_providers"].([]interface{})

		first := providers[0].(map[string]interface{})
		assert.Contains(t, first, "provider_id")
		assert.Contains(t, first, "provider_type")

		assert.Equal(t, "milvus", first["provider_id"])
		assert.Equal(t, "remote::milvus", first["provider_type"])
	})

	t.Run("should return empty array when Open GenAI Stack has no providers", func(t *testing.T) {
		emptyApp := newOGXHandlerTestAppWithClient(t, &mockEmptyClient{})

		rr, req := newHandlerTestRequest(t, emptyApp)
		emptyApp.OGXVectorStoresHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))

		var response map[string]interface{}
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()
		assert.NoError(t, json.Unmarshal(body, &response))

		data := response["data"].(map[string]interface{})
		assert.Len(t, data["vector_store_providers"].([]interface{}), 0, "Should return empty providers array")
	})
}

func TestOGXVectorStoresHandler_ErrorCases(t *testing.T) {
	app := newOGXHandlerTestApp(t)

	t.Run("should return 400 when namespace query parameter is missing", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodGet, "/api/v1/ogx/vector-stores", nil)
		assert.NoError(t, err)

		app.AttachNamespace(app.OGXVectorStoresHandler)(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)

		var response map[string]interface{}
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()
		assert.NoError(t, json.Unmarshal(body, &response))
		assert.Contains(t, response, "error")
	})

	t.Run("should return 400 when secretName query parameter is missing", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodGet, "/api/v1/ogx/vector-stores?namespace=test-namespace", nil)
		assert.NoError(t, err)

		ctx := context.WithValue(req.Context(), constants.NamespaceHeaderParameterKey, "test-namespace")
		req = req.WithContext(ctx)

		app.OGXVectorStoresHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)

		var response map[string]interface{}
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()
		assert.NoError(t, json.Unmarshal(body, &response))
		assert.Contains(t, response, "error")
	})

	t.Run("should return 404 when secret is not found", func(t *testing.T) {
		logger := slog.New(slog.NewTextHandler(io.Discard, nil))
		mockK8sClient := &corek8smocks.MockK8sClient{
			GetSecretFunc: func(_ context.Context, _, _ string) (*v1.Secret, error) {
				return nil, &corek8s.NotFoundError{Resource: "secret", Name: "missing-secret"}
			},
		}
		k8sService := corek8s.NewK8sService(corek8s.K8sServiceConfig{Logger: logger}, mockK8sClient)
		notFoundApp := &App{
			config: config.EnvConfig{Port: 4000},
			logger: logger,
			repositories: repositories.NewRepositories(repositories.RepositoriesConfig{
				K8sService:       k8sService,
				OGXClientFactory: ogxmocks.NewMockClientFactory(),
			}),
		}

		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodGet, "/api/v1/ogx/vector-stores?namespace=test-namespace&secretName=missing-secret", nil)
		assert.NoError(t, err)
		ctx := context.WithValue(req.Context(), constants.NamespaceHeaderParameterKey, "test-namespace")
		req = req.WithContext(ctx)

		notFoundApp.OGXVectorStoresHandler(rr, req, nil)

		assert.Equal(t, http.StatusNotFound, rr.Code)
	})

	t.Run("should return 500 when Open GenAI Stack client returns error", func(t *testing.T) {
		errApp := newOGXHandlerTestAppWithClient(t, &mockErrorClient{})

		rr, req := newHandlerTestRequest(t, errApp)
		errApp.OGXVectorStoresHandler(rr, req, nil)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)

		var response map[string]interface{}
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()
		assert.NoError(t, json.Unmarshal(body, &response))
		assert.Contains(t, response, "error")
	})

	t.Run("should return 502 when Open GenAI Stack client returns a connection error", func(t *testing.T) {
		ogxErrApp := newOGXHandlerTestAppWithClient(t, &mockOGXErrClient{})

		rr, req := newHandlerTestRequest(t, ogxErrApp)
		ogxErrApp.OGXVectorStoresHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadGateway, rr.Code)

		var response map[string]interface{}
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()
		assert.NoError(t, json.Unmarshal(body, &response))
		assert.Contains(t, response, "error")
		errField := response["error"].(map[string]interface{})
		assert.Equal(t, "bad_gateway", errField["code"])
	})
}

// Compile-time check: ensure test-local types satisfy the interface (declared in ogx_models_handler_test.go)
var _ = (*metav1.ObjectMeta)(nil)
