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
	"github.com/opendatahub-io/gen-ai/internal/repositories"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLlamaStackDistributionInstallHandler(t *testing.T) {
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
	app := App{
		config: config.EnvConfig{
			Port: 4000,
		},
		kubernetesClientFactory: k8sFactory,
		repositories:            repositories.NewRepositories(nil), // No LlamaStack client needed for this test
	}

	// Test successful case
	t.Run("should return 200 with data when LSD is installed successfully", func(t *testing.T) {
		// Create request with proper context and query parameters
		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/llamastack-distribution/install?modelName=test-model&namespace=test-namespace", nil)
		assert.NoError(t, err)

		// Add namespace and identity to context
		ctx := context.Background()
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "test-namespace")
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN", // Use one of the default test tokens
		})
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()

		app.LlamaStackDistributionInstallHandler(rr, req, nil)

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

		dataMap, ok := data.(map[string]interface{})
		assert.True(t, ok, "Data should be a map")

		assert.Equal(t, "lsd-gen-ai-playground", dataMap["name"])
		assert.Equal(t, "200", dataMap["http_status"])
	})

	// Test error cases - parameter validation
	t.Run("should return error when namespace is missing from context", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/llamastack-distribution/install?modelName=test-model", nil)
		assert.NoError(t, err)

		rr := httptest.NewRecorder()

		app.LlamaStackDistributionInstallHandler(rr, req, nil)

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
		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/llamastack-distribution/install?modelName=test-model&namespace=test-namespace", nil)
		assert.NoError(t, err)

		// Add namespace to context but no RequestIdentity
		ctx := context.WithValue(context.Background(), constants.NamespaceQueryParameterKey, "test-namespace")
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()

		app.LlamaStackDistributionInstallHandler(rr, req, nil)

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

	t.Run("should return error when modelName query parameter is missing", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/llamastack-distribution/install?namespace=test-namespace", nil)
		assert.NoError(t, err)

		// Add namespace and identity to context
		ctx := context.Background()
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "test-namespace")
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()

		app.LlamaStackDistributionInstallHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)

		var response map[string]interface{}
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)

		errorData, exists := response["error"]
		assert.True(t, exists, "Response should contain 'error' field")

		errorMap, ok := errorData.(map[string]interface{})
		assert.True(t, ok, "Error should be a map")

		assert.Equal(t, "400", errorMap["code"])
		assert.Contains(t, errorMap["message"], "missing required query parameter: modelName")
	})

	t.Run("should return error when modelName query parameter is empty", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/llamastack-distribution/install?modelName=&namespace=test-namespace", nil)
		assert.NoError(t, err)

		// Add namespace and identity to context
		ctx := context.Background()
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "test-namespace")
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()

		app.LlamaStackDistributionInstallHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)

		var response map[string]interface{}
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)

		errorData, exists := response["error"]
		assert.True(t, exists, "Response should contain 'error' field")

		errorMap, ok := errorData.(map[string]interface{})
		assert.True(t, ok, "Error should be a map")

		assert.Equal(t, "400", errorMap["code"])
		assert.Contains(t, errorMap["message"], "missing required query parameter: modelName")
	})

	// Test with different model names to ensure the parameter is passed correctly
	t.Run("should handle different model names correctly", func(t *testing.T) {
		testCases := []struct {
			name      string
			modelName string
		}{
			{
				name:      "simple model name",
				modelName: "llama-3.2-3b-instruct-cpu",
			},
			{
				name:      "model with special characters",
				modelName: "model-with-dashes_and_underscores",
			},
			{
				name:      "model with version",
				modelName: "model:v1.0.0",
			},
		}

		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/llamastack-distribution/install?modelName="+tc.modelName+"&namespace=test-namespace", nil)
				assert.NoError(t, err)

				// Add namespace and identity to context
				ctx := context.Background()
				ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "test-namespace")
				ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
					Token: "FAKE_BEARER_TOKEN",
				})
				req = req.WithContext(ctx)

				rr := httptest.NewRecorder()

				app.LlamaStackDistributionInstallHandler(rr, req, nil)

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

				dataMap, ok := data.(map[string]interface{})
				assert.True(t, ok, "Data should be a map")

				assert.Equal(t, "lsd-gen-ai-playground", dataMap["name"])
				assert.Equal(t, "200", dataMap["http_status"])
			})
		}
	})
}
