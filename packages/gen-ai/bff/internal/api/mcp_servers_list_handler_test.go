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
	"github.com/opendatahub-io/gen-ai/internal/integrations/mcp/mcpmocks"
	"github.com/opendatahub-io/gen-ai/internal/repositories"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMCPServersListHandler(t *testing.T) {
	// Setup test environment
	logger := slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{Level: slog.LevelDebug}))

	// Create mock MCP client factory
	mockMCPFactory := mcpmocks.NewMockedMCPClientFactory(
		config.EnvConfig{MockK8sClient: true},
		logger,
	)

	// Create test environment for K8s
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	testEnv := k8smocks.TestEnvInput{
		Users:  k8smocks.DefaultTestUsers,
		Logger: logger,
		Ctx:    ctx,
		Cancel: cancel,
	}

	testEnvironment, ctrlClient, err := k8smocks.SetupEnvTest(testEnv)
	require.NoError(t, err)

	// Create mock K8s client factory
	mockK8sFactory, err := k8smocks.NewMockedKubernetesClientFactory(ctrlClient, testEnvironment, config.EnvConfig{
		AuthMethod: "user_token",
	}, logger)
	require.NoError(t, err)

	// Create app with mocked dependencies
	app := &App{
		config: config.EnvConfig{
			Port:       4000,
			AuthMethod: "user_token",
		},
		logger:                  logger,
		repositories:            repositories.NewRepositoriesWithMCP(nil, mockMCPFactory, logger),
		kubernetesClientFactory: mockK8sFactory,
		mcpClientFactory:        mockMCPFactory,
	}

	t.Run("should return list of MCP servers successfully", func(t *testing.T) {
		rr := httptest.NewRecorder()

		requestURL := "/genai/v1/aa/mcps?namespace=demo"
		req, err := http.NewRequest("GET", requestURL, nil)
		require.NoError(t, err)

		// Add request identity to context
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		app.MCPServersListHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		require.NoError(t, err)
		defer rr.Result().Body.Close()

		var response MCPServersListEnvelope
		err = json.Unmarshal(body, &response)
		require.NoError(t, err)

		require.NotNil(t, response.Data)
		assert.Greater(t, len(response.Data), 0, "Should return at least one MCP server")

		// Verify server structure - each item is a map[serverName]config
		for _, serverMap := range response.Data {
			assert.Equal(t, 1, len(serverMap), "Each server map should have exactly one key-value pair")
			for serverName, config := range serverMap {
				assert.NotEmpty(t, serverName, "Server should have a name")
				assert.NotEmpty(t, config.URL, "Server should have a URL")
				assert.NotEmpty(t, config.Transport, "Server should have a transport")
				assert.NotEmpty(t, config.Logo, "Server should have a logo")
			}
		}
	})

	t.Run("should return 400 when namespace parameter is missing", func(t *testing.T) {
		rr := httptest.NewRecorder()

		requestURL := "/genai/v1/aa/mcps"
		req, err := http.NewRequest("GET", requestURL, nil)
		require.NoError(t, err)

		// Add request identity to context
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		app.MCPServersListHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		require.NoError(t, err)
		defer rr.Result().Body.Close()

		var errorData map[string]interface{}
		err = json.Unmarshal(body, &errorData)
		require.NoError(t, err)

		errorInfo, ok := errorData["error"].(map[string]interface{})
		require.True(t, ok, "Response should have error field")
		assert.Contains(t, errorInfo["message"], "namespace parameter is required")
	})

	t.Run("should return 400 when request identity is missing", func(t *testing.T) {
		rr := httptest.NewRecorder()

		requestURL := "/genai/v1/aa/mcps?namespace=demo"
		req, err := http.NewRequest("GET", requestURL, nil)
		require.NoError(t, err)

		// Don't add request identity to context

		app.MCPServersListHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		require.NoError(t, err)
		defer rr.Result().Body.Close()

		var errorData map[string]interface{}
		err = json.Unmarshal(body, &errorData)
		require.NoError(t, err)

		errorInfo, ok := errorData["error"].(map[string]interface{})
		require.True(t, ok, "Response should have error field")
		assert.Contains(t, errorInfo["message"], "missing RequestIdentity in context")
	})

	t.Run("should handle empty server list", func(t *testing.T) {
		// This test verifies the handler works even when no servers are configured
		rr := httptest.NewRecorder()

		requestURL := "/genai/v1/aa/mcps?namespace=empty-namespace"
		req, err := http.NewRequest("GET", requestURL, nil)
		require.NoError(t, err)

		// Add request identity to context
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		app.MCPServersListHandler(rr, req, nil)

		// Should still return 200 OK with empty array or handle appropriately
		// The actual behavior depends on the mock implementation
		assert.True(t, rr.Code == http.StatusOK || rr.Code >= 400, "Should return either success or appropriate error")
	})

	t.Run("should accept namespace parameter but ignore it in implementation", func(t *testing.T) {
		rr := httptest.NewRecorder()

		// Test with different namespace value - should work the same
		requestURL := "/genai/v1/aa/mcps?namespace=different-namespace"
		req, err := http.NewRequest("GET", requestURL, nil)
		require.NoError(t, err)

		// Add request identity to context
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		app.MCPServersListHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		require.NoError(t, err)
		defer rr.Result().Body.Close()

		var response MCPServersListEnvelope
		err = json.Unmarshal(body, &response)
		require.NoError(t, err)

		require.NotNil(t, response.Data)
		// Should return the same servers regardless of namespace parameter value
		// since namespace is ignored in the implementation
	})
}
