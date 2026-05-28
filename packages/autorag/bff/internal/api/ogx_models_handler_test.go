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
	ogx "github.com/opendatahub-io/autorag-library/bff/internal/integrations/ogx"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/ogx/ogxmocks"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	"github.com/opendatahub-io/autorag-library/bff/internal/repositories"
	corek8s "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
	corek8smocks "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes/mocks"
	"github.com/stretchr/testify/assert"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// newOGXHandlerTestApp creates a lightweight App wired with a mock OGX client factory
// and a mock K8s client that returns a valid OGX secret.
// A non-nil logger is required because error paths call app.logger.Error via serverErrorResponse.
func newOGXHandlerTestApp(t *testing.T) *App {
	t.Helper()
	return newOGXHandlerTestAppWithClient(t, nil)
}

// newOGXHandlerTestAppWithClient creates a test App with an optional custom OGX client override.
// When customOGXClient is non-nil it is set on the mock factory via SetMockClient.
func newOGXHandlerTestAppWithClient(t *testing.T, customOGXClient ogx.OGXClientInterface) *App {
	t.Helper()
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	factory := ogxmocks.NewMockClientFactory()
	if customOGXClient != nil {
		factory.(*ogxmocks.MockClientFactory).SetMockClient(customOGXClient)
	}

	// Mock K8s client returns a secret with the required OGX credentials
	mockK8sClient := &corek8smocks.MockK8sClient{
		GetSecretFunc: func(_ context.Context, namespace, secretName string) (*v1.Secret, error) {
			return &v1.Secret{
				ObjectMeta: metav1.ObjectMeta{
					Name:      secretName,
					Namespace: namespace,
				},
				Data: map[string][]byte{
					"ogx_client_base_url": []byte("http://ogx.test-namespace.svc.cluster.local:8321"),
					"ogx_client_api_key":  []byte("test-api-key"),
				},
			}, nil
		},
	}
	k8sService := corek8s.NewK8sService(corek8s.K8sServiceConfig{Logger: logger}, mockK8sClient)

	return &App{
		config: config.EnvConfig{Port: 4000},
		logger: logger,
		repositories: repositories.NewRepositories(repositories.RepositoriesConfig{
			K8sService:       k8sService,
			OGXClientFactory: factory,
		}),
	}
}

// newHandlerTestRequest creates a GET request for the OGX models endpoint with
// namespace in context and secretName as a query parameter.
func newHandlerTestRequest(t *testing.T, _ *App) (*httptest.ResponseRecorder, *http.Request) {
	t.Helper()
	rr := httptest.NewRecorder()
	req, err := http.NewRequest(http.MethodGet, "/api/v1/ogx/models?namespace=test-namespace&secretName=test-secret", nil)
	assert.NoError(t, err)

	// Inject namespace into context (normally done by AttachNamespace middleware)
	ctx := context.WithValue(req.Context(), constants.NamespaceHeaderParameterKey, "test-namespace")
	req = req.WithContext(ctx)

	return rr, req
}

func TestOGXModelsHandler_Success(t *testing.T) {
	app := newOGXHandlerTestApp(t)

	t.Run("should return all models successfully", func(t *testing.T) {
		rr, req := newHandlerTestRequest(t, app)
		app.OGXModelsHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))

		var response map[string]interface{}
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()
		assert.NoError(t, json.Unmarshal(body, &response))

		// Verify response contains data envelope with models array
		assert.Contains(t, response, "data")
		data := response["data"].(map[string]interface{})
		assert.Contains(t, data, "models")

		// Verify models array contains all models (7 total from mock)
		models := data["models"].([]interface{})
		assert.Len(t, models, 7, "Should return all 7 models")
	})

	t.Run("should have correct stable API model structure", func(t *testing.T) {
		rr, req := newHandlerTestRequest(t, app)
		app.OGXModelsHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		var response map[string]interface{}
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()
		assert.NoError(t, json.Unmarshal(body, &response))

		data := response["data"].(map[string]interface{})
		models := data["models"].([]interface{})

		// Verify first model has stable public API structure
		firstModel := models[0].(map[string]interface{})
		assert.Contains(t, firstModel, "id")
		assert.Contains(t, firstModel, "type")
		assert.Contains(t, firstModel, "provider")
		assert.Contains(t, firstModel, "resource_path")

		// Verify mock model values
		assert.Equal(t, "llama3.2:3b", firstModel["id"])
		assert.Equal(t, "llm", firstModel["type"])
		assert.Equal(t, "ollama", firstModel["provider"])
		assert.Equal(t, "ollama://models/llama3.2:3b", firstModel["resource_path"])
	})

	t.Run("should return empty array when Open GenAI Stack has no models", func(t *testing.T) {
		emptyApp := newOGXHandlerTestAppWithClient(t, &mockEmptyClient{})

		rr, req := newHandlerTestRequest(t, emptyApp)
		emptyApp.OGXModelsHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))

		var response map[string]interface{}
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()
		assert.NoError(t, json.Unmarshal(body, &response))

		data := response["data"].(map[string]interface{})
		assert.Len(t, data["models"].([]interface{}), 0, "Should return empty models array")
	})
}

func TestOGXModelsHandler_ErrorCases(t *testing.T) {
	app := newOGXHandlerTestApp(t)

	t.Run("should return 400 when namespace query parameter is missing", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodGet, "/api/v1/ogx/models", nil) // no ?namespace=
		assert.NoError(t, err)

		// Run through the full middleware chain — AttachNamespace rejects the request before
		// the handler is reached, verifying the end-to-end 400 behaviour.
		app.AttachNamespace(app.OGXModelsHandler)(rr, req, nil)

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
		req, err := http.NewRequest(http.MethodGet, "/api/v1/ogx/models?namespace=test-namespace", nil)
		assert.NoError(t, err)

		ctx := context.WithValue(req.Context(), constants.NamespaceHeaderParameterKey, "test-namespace")
		req = req.WithContext(ctx)

		app.OGXModelsHandler(rr, req, nil)

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
		req, err := http.NewRequest(http.MethodGet, "/api/v1/ogx/models?namespace=test-namespace&secretName=missing-secret", nil)
		assert.NoError(t, err)
		ctx := context.WithValue(req.Context(), constants.NamespaceHeaderParameterKey, "test-namespace")
		req = req.WithContext(ctx)

		notFoundApp.OGXModelsHandler(rr, req, nil)

		assert.Equal(t, http.StatusNotFound, rr.Code)
	})

	t.Run("should return 500 when Open GenAI Stack client returns error", func(t *testing.T) {
		errApp := newOGXHandlerTestAppWithClient(t, &mockErrorClient{})

		rr, req := newHandlerTestRequest(t, errApp)
		errApp.OGXModelsHandler(rr, req, nil)

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
		ogxErrApp.OGXModelsHandler(rr, req, nil)

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

// mockErrorClient is a mock client that always returns a generic error
type mockErrorClient struct{}

var _ ogx.OGXClientInterface = (*mockErrorClient)(nil)

func (m *mockErrorClient) ListModels(ctx context.Context) ([]models.OGXNativeModel, error) {
	return nil, assert.AnError
}

func (m *mockErrorClient) ListProviders(ctx context.Context) ([]models.OGXProvider, error) {
	return nil, assert.AnError
}

// mockEmptyClient is a mock client that returns an empty models list
type mockEmptyClient struct{}

var _ ogx.OGXClientInterface = (*mockEmptyClient)(nil)

func (m *mockEmptyClient) ListModels(ctx context.Context) ([]models.OGXNativeModel, error) {
	return []models.OGXNativeModel{}, nil
}

func (m *mockEmptyClient) ListProviders(ctx context.Context) ([]models.OGXProvider, error) {
	return []models.OGXProvider{}, nil
}

// mockOGXErrClient is a mock client that returns a typed OGXError (connection failure)
type mockOGXErrClient struct{}

var _ ogx.OGXClientInterface = (*mockOGXErrClient)(nil)

func (m *mockOGXErrClient) ListModels(ctx context.Context) ([]models.OGXNativeModel, error) {
	return nil, ogx.NewConnectionError("mock: could not reach Open GenAI Stack server")
}

func (m *mockOGXErrClient) ListProviders(ctx context.Context) ([]models.OGXProvider, error) {
	return nil, ogx.NewConnectionError("mock: could not reach Open GenAI Stack server")
}
