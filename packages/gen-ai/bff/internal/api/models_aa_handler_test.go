package api

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"log/slog"

	"github.com/opendatahub-io/gen-ai/internal/config"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes/k8smocks"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack/lsmocks"
	"github.com/opendatahub-io/gen-ai/internal/repositories"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestModelsAAHandler(t *testing.T) {
	// Setup test environment (takes ~1-2 seconds)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	testEnv, ctrlClient, err := k8smocks.SetupEnvTest(k8smocks.TestEnvInput{
		Users:  k8smocks.DefaultTestUsers,
		Logger: slog.Default(),
		Ctx:    ctx,
		Cancel: cancel,
	})
	require.NoError(t, err)
	defer func() {
		if err := testEnv.Stop(); err != nil {
			t.Logf("Failed to stop test environment: %v", err)
		}
	}() // Cleanup happens automatically

	// Create mock factory (instant)
	k8sFactory, err := k8smocks.NewTokenClientFactory(ctrlClient, testEnv.Config, slog.Default())
	require.NoError(t, err)

	// Create test app with real mock infrastructure
	llamaStackClientFactory := lsmocks.NewMockClientFactory()
	app := App{
		config: config.EnvConfig{
			Port: 4000,
		},
		kubernetesClientFactory: k8sFactory,
		llamaStackClientFactory: llamaStackClientFactory,
		repositories:            repositories.NewRepositories(),
	}

	// Test successful case
	t.Run("should return 200 with AA models data when models are found", func(t *testing.T) {
		// Create request with proper context
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/models/aa", nil)
		assert.NoError(t, err)

		// Add namespace and identity to context
		ctx := context.Background()
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "mock-test-namespace-1")
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN", // Use one of the default test tokens
		})
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()

		app.ModelsAAHandler(rr, req, nil)

		rs := rr.Result()
		defer func() { _ = rs.Body.Close() }()

		body, err := io.ReadAll(rs.Body)
		assert.NoError(t, err)

		var response map[string]interface{}
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		assert.Equal(t, http.StatusOK, rr.Code)

		data, exists := response["data"]
		assert.True(t, exists, "Response should contain 'data' field")

		dataArray, ok := data.([]interface{})
		assert.True(t, ok, "Data should be an array")
		assert.Len(t, dataArray, 3, "Should return 3 mock AA models for mock-test-namespace-1")

		// Check first model (granite-7b-code)
		firstModel, ok := dataArray[0].(map[string]interface{})
		assert.True(t, ok, "First model should be a map")
		assert.Equal(t, "granite-7b-code", firstModel["model_name"])
		assert.Equal(t, "OpenVINO Model Server", firstModel["serving_runtime"])
		assert.Equal(t, "v2", firstModel["api_protocol"])
		assert.Equal(t, "v2025.1", firstModel["version"])
		assert.Equal(t, "Code generation", firstModel["usecase"])
		assert.Equal(t, "IBM Granite 7B model specialized for code generation tasks", firstModel["description"])

		// Check endpoints array
		endpoints, ok := firstModel["endpoints"].([]interface{})
		assert.True(t, ok, "Endpoints should be an array")
		assert.Len(t, endpoints, 2, "Should have 2 endpoints")
		assert.Equal(t, "internal: http://granite-7b-code.mock-test-namespace-1.svc.cluster.local:8080", endpoints[0])
		assert.Equal(t, "external: https://granite-7b-code-mock-test-namespace-1.example.com", endpoints[1])

		// Check second model (llama-3.1-8b-instruct)
		secondModel, ok := dataArray[1].(map[string]interface{})
		assert.True(t, ok, "Second model should be a map")
		assert.Equal(t, "llama-3.1-8b-instruct", secondModel["model_name"])
		assert.Equal(t, "TorchServe", secondModel["serving_runtime"])
		assert.Equal(t, "v1", secondModel["api_protocol"])
		assert.Equal(t, "v2025.1", secondModel["version"])
		assert.Equal(t, "General chat", secondModel["usecase"])
		assert.Equal(t, "Meta Llama 3.1 8B parameter model optimized for instruction following", secondModel["description"])

		// Check second model endpoints
		secondEndpoints, ok := secondModel["endpoints"].([]interface{})
		assert.True(t, ok, "Second model endpoints should be an array")
		assert.Len(t, secondEndpoints, 2, "Should have 2 endpoints")
		assert.Equal(t, "internal: http://llama-3.1-8b-instruct.mock-test-namespace-1.svc.cluster.local:8080", secondEndpoints[0])
		assert.Equal(t, "external: https://llama-3.1-8b-instruct-mock-test-namespace-1.example.com", secondEndpoints[1])

		// Check third model
		thirdModel, ok := dataArray[2].(map[string]interface{})
		assert.True(t, ok, "Third model should be a map")
		assert.Equal(t, "mistral-7b-instruct", thirdModel["model_name"])
		assert.Equal(t, "TorchServe", thirdModel["serving_runtime"])
		assert.Equal(t, "v1", thirdModel["api_protocol"])
		assert.Equal(t, "v2025.1", thirdModel["version"])
		assert.Equal(t, "Multilingual, Reasoning", thirdModel["usecase"])
		assert.Equal(t, "Mistral 7B instruction-tuned model for general purpose tasks", thirdModel["description"])

		// Check third model endpoints
		thirdEndpoints, ok := thirdModel["endpoints"].([]interface{})
		assert.True(t, ok, "Third model endpoints should be an array")
		assert.Len(t, thirdEndpoints, 1, "Should have 1 endpoint")
		assert.Equal(t, "internal: http://mistral-7b-instruct.mock-test-namespace-1.svc.cluster.local:8080", thirdEndpoints[0])
	})

	// Test error cases - simple parameter validation
	t.Run("should return error when namespace is missing from context", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/models/aa", nil)
		assert.NoError(t, err)

		rr := httptest.NewRecorder()

		app.ModelsAAHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)

		var response map[string]interface{}
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)

		errorData, exists := response["error"]
		assert.True(t, exists, "Response should contain 'error' field")

		errorMap, ok := errorData.(map[string]interface{})
		assert.True(t, ok, "Error should be a map")

		assert.Equal(t, "400", errorMap["code"])
		assert.Contains(t, errorMap["message"], "missing namespace in the context")
	})

	t.Run("should return error when RequestIdentity is missing from context", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/models/aa", nil)
		assert.NoError(t, err)

		// Add namespace to context but no RequestIdentity
		ctx := context.WithValue(context.Background(), constants.NamespaceQueryParameterKey, "mock-test-namespace-1")
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()

		app.ModelsAAHandler(rr, req, nil)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)

		var response map[string]interface{}
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)

		errorData, exists := response["error"]
		assert.True(t, exists, "Response should contain 'error' field")

		errorMap, ok := errorData.(map[string]interface{})
		assert.True(t, ok, "Error should be a map")

		assert.Equal(t, "401", errorMap["code"])
		assert.Contains(t, errorMap["message"], "missing RequestIdentity in context")
	})
}
