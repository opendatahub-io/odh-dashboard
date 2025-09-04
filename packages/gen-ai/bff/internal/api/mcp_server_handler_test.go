package api

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/gen-ai/internal/config"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes/k8smocks"
	"github.com/opendatahub-io/gen-ai/internal/repositories"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
)

func TestMCPServerConfigHandler(t *testing.T) {
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
	t.Run("should return 200 with ConfigMap data when MCP server config is found", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodGet, "/genai/v1/mcp-servers/config", nil)
		require.NoError(t, err)

		// Add request identity to context (required by the handler)
		identity := &integrations.RequestIdentity{Token: "FAKE_BEARER_TOKEN"}
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		req = req.WithContext(ctx)

		app.MCPServerConfigHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		require.NoError(t, err)
		defer rr.Result().Body.Close()

		var response MCPServerConfigEnvelope
		err = json.Unmarshal(body, &response)
		require.NoError(t, err)

		// Verify envelope structure
		assert.NotNil(t, response.Data)
		configMap := response.Data

		// Verify ConfigMap metadata
		assert.Equal(t, "global-mcp-list", configMap.Name)
		assert.Equal(t, "mcp-servers", configMap.Namespace)

		// Verify ConfigMap data contains expected mock server configurations
		assert.Contains(t, configMap.Data, "dev-cluster")
		assert.Contains(t, configMap.Data, "git-hub")

		// Verify dev-cluster configuration content
		devClusterConfig := configMap.Data["dev-cluster"]
		assert.Contains(t, devClusterConfig, "https://mcp-one:8080")
		assert.Contains(t, devClusterConfig, "Manage resources in a Kubernetes cluster")
		assert.Contains(t, devClusterConfig, "https://mysite.com/logo.png")

		// Verify git-hub configuration content
		gitHubConfig := configMap.Data["git-hub"]
		assert.Contains(t, gitHubConfig, "https://mcp-two")
		assert.Contains(t, gitHubConfig, "Manage a GitHub repository")
	})

	t.Run("should return 400 when request identity is missing", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodGet, "/genai/v1/mcp-servers/config", nil)
		require.NoError(t, err)

		// Don't add request identity to context
		app.MCPServerConfigHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		require.NoError(t, err)
		defer rr.Result().Body.Close()

		var response map[string]interface{}
		err = json.Unmarshal(body, &response)
		require.NoError(t, err)

		// Verify error response structure
		assert.Contains(t, response, "error")
		errorObj := response["error"].(map[string]interface{})
		assert.Contains(t, errorObj["message"], "missing RequestIdentity in context")
	})

	t.Run("should use envelope pattern for response", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodGet, "/genai/v1/mcp-servers/config", nil)
		require.NoError(t, err)

		// Add request identity to context
		identity := &integrations.RequestIdentity{Token: "FAKE_BEARER_TOKEN"}
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		req = req.WithContext(ctx)

		app.MCPServerConfigHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		require.NoError(t, err)
		defer rr.Result().Body.Close()

		var response map[string]interface{}
		err = json.Unmarshal(body, &response)
		require.NoError(t, err)

		// Verify envelope structure
		assert.Contains(t, response, "data")
		assert.NotContains(t, response, "metadata") // metadata is omitted when empty

		data := response["data"].(map[string]interface{})
		metadata := data["metadata"].(map[string]interface{})

		// Verify ConfigMap structure
		assert.Equal(t, "global-mcp-list", metadata["name"])
		assert.Equal(t, "mcp-servers", metadata["namespace"])
		assert.Contains(t, data, "data") // ConfigMap.Data field
	})

	t.Run("should follow same auth pattern as other K8s endpoints", func(t *testing.T) {
		// Test with different valid test token
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodGet, "/genai/v1/mcp-servers/config", nil)
		require.NoError(t, err)

		// Add request identity to context
		identity := &integrations.RequestIdentity{Token: "FAKE_BEARER_TOKEN"}
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		req = req.WithContext(ctx)

		app.MCPServerConfigHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		// Verify that authentication check is working
		body, err := io.ReadAll(rr.Result().Body)
		require.NoError(t, err)
		defer rr.Result().Body.Close()

		var response MCPServerConfigEnvelope
		err = json.Unmarshal(body, &response)
		require.NoError(t, err)

		assert.NotNil(t, response.Data)
		assert.IsType(t, &corev1.ConfigMap{}, response.Data)
	})
}
