package api

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"log/slog"

	"github.com/opendatahub-io/gen-ai/internal/config"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes/k8smocks"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack/lsmocks"
	"github.com/opendatahub-io/gen-ai/internal/repositories"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	// Import the typed LlamaStackDistribution types
)

func TestLlamaStackDistributionStatusHandler(t *testing.T) {
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

	// Test successful case - similar to TestHealthCheckHandler
	t.Run("should return 200 with data when LSD is found", func(t *testing.T) {
		// Create request with proper context
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/llamastack-distribution/status", nil)
		assert.NoError(t, err)

		// Add namespace and identity to context
		ctx := context.Background()
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "test-namespace")
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN", // Use one of the default test tokens
		})
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()

		app.LlamaStackDistributionStatusHandler(rr, req, nil)

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

		assert.Equal(t, "mock-lsd", dataMap["name"])
		assert.Equal(t, "Ready", dataMap["phase"])
		assert.Equal(t, "v0.2.0", dataMap["version"])
	})

	// Test error cases - simple parameter validation
	t.Run("should return error when namespace is missing from context", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/llamastack-distribution/status", nil)
		assert.NoError(t, err)

		rr := httptest.NewRecorder()

		app.LlamaStackDistributionStatusHandler(rr, req, nil)

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
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/llamastack-distribution/status", nil)
		assert.NoError(t, err)

		// Add namespace to context but no RequestIdentity
		ctx := context.WithValue(context.Background(), constants.NamespaceQueryParameterKey, "test-namespace")
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()

		app.LlamaStackDistributionStatusHandler(rr, req, nil)

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
		repositories:            repositories.NewRepositories(), // No LlamaStack client needed for this test
	}

	// Test successful installation
	t.Run("should install LSD successfully with models", func(t *testing.T) {
		// Create request body with models
		requestBody := map[string]interface{}{
			"models": []string{"llama-3-2-3b-instruct", "granite-embedding-125m"},
		}
		jsonBody, err := json.Marshal(requestBody)
		require.NoError(t, err)

		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/llamastack-distribution/install", bytes.NewReader(jsonBody))
		require.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")

		// Add namespace and identity to context
		ctx := context.Background()
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "mock-test-namespace-1")
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

		// Debug: Print the response to see what we're getting
		t.Logf("Response body: %s", string(body))

		assert.Equal(t, http.StatusOK, rr.Code)

		data, exists := response["data"]
		assert.True(t, exists, "Response should contain 'data' field")

		dataMap, ok := data.(map[string]interface{})
		assert.True(t, ok, "Data should be a map")

		assert.Equal(t, "mock-lsd", dataMap["name"])
		assert.Equal(t, "200", dataMap["httpStatus"])
	})

	// Test error case - missing request body
	t.Run("should return error when request body is missing", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/llamastack-distribution/install", nil)
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
		assert.Contains(t, errorMap["message"], "request body is required")
	})

	// Test error case - missing namespace
	t.Run("should return error when namespace is missing from context", func(t *testing.T) {
		requestBody := map[string]interface{}{
			"models": []string{"llama-3-2-3b-instruct"},
		}
		jsonBody, err := json.Marshal(requestBody)
		require.NoError(t, err)

		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/llamastack-distribution/install", bytes.NewReader(jsonBody))
		require.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")

		// Add identity to context but no namespace
		ctx := context.WithValue(context.Background(), constants.RequestIdentityKey, &integrations.RequestIdentity{
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
		assert.Contains(t, errorMap["message"], "missing namespace in the context")
	})

	// Test error case - LSD already exists
	t.Run("should return error when LSD already exists in namespace", func(t *testing.T) {
		requestBody := map[string]interface{}{
			"models": []string{"llama-3-2-3b-instruct"},
		}
		jsonBody, err := json.Marshal(requestBody)
		require.NoError(t, err)

		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/llamastack-distribution/install", bytes.NewReader(jsonBody))
		require.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")

		// Use mock-test-namespace-2 which has an existing LSD according to the mock
		ctx := context.Background()
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "mock-test-namespace-2")
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
		assert.Contains(t, errorMap["message"], "LlamaStackDistribution already exists in namespace mock-test-namespace-2")
	})
}

func TestLlamaStackDistributionDeleteHandler(t *testing.T) {
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
		repositories:            repositories.NewRepositories(), // No LlamaStack client needed for this test
	}

	// Test successful deletion
	t.Run("should delete LSD successfully with valid display name", func(t *testing.T) {
		// Use a unique namespace for this test to avoid conflicts with other tests
		testNamespace := fmt.Sprintf("delete-test-namespace-%d", time.Now().UnixNano())

		// First, install an LSD to have something to delete
		installRequestBody := map[string]interface{}{
			"models": []string{"llama-3-2-3b-instruct"},
		}
		installJsonBody, err := json.Marshal(installRequestBody)
		require.NoError(t, err)

		installReq, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/llamastack-distribution/install", bytes.NewReader(installJsonBody))
		require.NoError(t, err)
		installReq.Header.Set("Content-Type", "application/json")

		// Add namespace and identity to context
		installCtx := context.Background()
		installCtx = context.WithValue(installCtx, constants.NamespaceQueryParameterKey, testNamespace)
		installCtx = context.WithValue(installCtx, constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		installReq = installReq.WithContext(installCtx)

		installRr := httptest.NewRecorder()
		app.LlamaStackDistributionInstallHandler(installRr, installReq, nil)
		require.Equal(t, http.StatusOK, installRr.Code, "Install should succeed first")

		// Now test deletion
		deleteRequestBody := map[string]interface{}{
			"name": "mock-lsd", // This matches the display name created by the install operation
		}
		deleteJsonBody, err := json.Marshal(deleteRequestBody)
		require.NoError(t, err)

		req, err := http.NewRequest(http.MethodDelete, "/gen-ai/api/v1/llamastack-distribution/delete", bytes.NewReader(deleteJsonBody))
		require.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")

		// Add namespace and identity to context
		ctx := context.Background()
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, testNamespace)
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()

		app.LlamaStackDistributionDeleteHandler(rr, req, nil)

		rs := rr.Result()
		defer func() { _ = rs.Body.Close() }()

		body, err := io.ReadAll(rs.Body)
		assert.NoError(t, err)

		var response map[string]interface{}
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		// Debug: Print the response to see what we're getting
		t.Logf("Response body: %s", string(body))

		assert.Equal(t, http.StatusOK, rr.Code)

		data, exists := response["data"]
		assert.True(t, exists, "Response should contain 'data' field")

		dataMap, ok := data.(map[string]interface{})
		assert.True(t, ok, "Data should be a map")

		assert.Equal(t, "LlamaStackDistribution deleted successfully", dataMap["data"])
	})

	// Test error case - missing request body
	t.Run("should return error when request body is missing", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodDelete, "/gen-ai/api/v1/llamastack-distribution/delete", nil)
		assert.NoError(t, err)

		// Add namespace and identity to context
		ctx := context.Background()
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "test-namespace")
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()

		app.LlamaStackDistributionDeleteHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)

		var response map[string]interface{}
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)

		errorData, exists := response["error"]
		assert.True(t, exists, "Response should contain 'error' field")

		errorMap, ok := errorData.(map[string]interface{})
		assert.True(t, ok, "Error should be a map")

		assert.Equal(t, "400", errorMap["code"])
		assert.Contains(t, errorMap["message"], "request body is required")
	})

	// Test error case - empty name
	t.Run("should return error when name is empty", func(t *testing.T) {
		requestBody := map[string]interface{}{
			"name": "",
		}
		jsonBody, err := json.Marshal(requestBody)
		require.NoError(t, err)

		req, err := http.NewRequest(http.MethodDelete, "/gen-ai/api/v1/llamastack-distribution/delete", bytes.NewReader(jsonBody))
		require.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")

		// Add namespace and identity to context
		ctx := context.Background()
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "test-namespace")
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()

		app.LlamaStackDistributionDeleteHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)

		var response map[string]interface{}
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)

		errorData, exists := response["error"]
		assert.True(t, exists, "Response should contain 'error' field")

		errorMap, ok := errorData.(map[string]interface{})
		assert.True(t, ok, "Error should be a map")

		assert.Equal(t, "400", errorMap["code"])
		assert.Contains(t, errorMap["message"], "lsd name cannot be empty")
	})

	// Test error case - missing namespace
	t.Run("should return error when namespace is missing from context", func(t *testing.T) {
		requestBody := map[string]interface{}{
			"name": "test-lsd",
		}
		jsonBody, err := json.Marshal(requestBody)
		require.NoError(t, err)

		req, err := http.NewRequest(http.MethodDelete, "/gen-ai/api/v1/llamastack-distribution/delete", bytes.NewReader(jsonBody))
		require.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")

		// Add identity to context but no namespace
		ctx := context.WithValue(context.Background(), constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()

		app.LlamaStackDistributionDeleteHandler(rr, req, nil)

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

	// Test error case - LSD not found
	t.Run("should return error when LSD with display name is not found", func(t *testing.T) {
		requestBody := map[string]interface{}{
			"name": "non-existent-lsd",
		}
		jsonBody, err := json.Marshal(requestBody)
		require.NoError(t, err)

		req, err := http.NewRequest(http.MethodDelete, "/gen-ai/api/v1/llamastack-distribution/delete", bytes.NewReader(jsonBody))
		require.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")

		// Add namespace and identity to context
		ctx := context.Background()
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "test-namespace")
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()

		app.LlamaStackDistributionDeleteHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)

		var response map[string]interface{}
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)

		errorData, exists := response["error"]
		assert.True(t, exists, "Response should contain 'error' field")

		errorMap, ok := errorData.(map[string]interface{})
		assert.True(t, ok, "Error should be a map")

		assert.Equal(t, "400", errorMap["code"])
		assert.Contains(t, errorMap["message"], "LlamaStackDistribution with display name 'non-existent-lsd' not found")
	})

	// Test error case - empty namespace (no LSDs)
	t.Run("should return error when no LSDs found in namespace", func(t *testing.T) {
		requestBody := map[string]interface{}{
			"name": "any-lsd",
		}
		jsonBody, err := json.Marshal(requestBody)
		require.NoError(t, err)

		req, err := http.NewRequest(http.MethodDelete, "/gen-ai/api/v1/llamastack-distribution/delete", bytes.NewReader(jsonBody))
		require.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")

		// Use empty namespace (mock-test-namespace-1 returns empty LSD list)
		ctx := context.Background()
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "mock-test-namespace-1")
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()

		app.LlamaStackDistributionDeleteHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)

		var response map[string]interface{}
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)

		errorData, exists := response["error"]
		assert.True(t, exists, "Response should contain 'error' field")

		errorMap, ok := errorData.(map[string]interface{})
		assert.True(t, ok, "Error should be a map")

		assert.Equal(t, "400", errorMap["code"])
		assert.Contains(t, errorMap["message"], "no LlamaStackDistribution found in namespace mock-test-namespace-1 with OpenDataHubDashboardLabelKey annotation")
	})
}
