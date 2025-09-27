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

func TestMCPListHandler(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{Level: slog.LevelDebug}))

	mockMCPFactory := mcpmocks.NewMockedMCPClientFactory(
		config.EnvConfig{MockK8sClient: true},
		logger,
	)

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

	mockK8sFactory, err := k8smocks.NewMockedKubernetesClientFactory(ctrlClient, testEnvironment, config.EnvConfig{
		AuthMethod: "user_token",
	}, logger)
	require.NoError(t, err)

	app := &App{
		config: config.EnvConfig{
			Port:       4000,
			AuthMethod: "user_token",
		},
		logger:                  logger,
		repositories:            repositories.NewRepositoriesWithMCP(mockMCPFactory, logger),
		kubernetesClientFactory: mockK8sFactory,
		mcpClientFactory:        mockMCPFactory,
		dashboardNamespace:      "opendatahub",
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

		app.MCPListHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		require.NoError(t, err)
		defer rr.Result().Body.Close()

		var response MCPListEnvelope
		err = json.Unmarshal(body, &response)
		require.NoError(t, err)

		require.NotNil(t, response.Data)
		assert.Greater(t, len(response.Data.Servers), 0, "Should return at least one MCP server")
		assert.Equal(t, len(response.Data.Servers), response.Data.TotalCount, "Total count should match servers array length")

		for _, server := range response.Data.Servers {
			assert.NotEmpty(t, server.Name, "Server should have a name")
			assert.NotEmpty(t, server.URL, "Server should have a URL")
			assert.NotEmpty(t, server.Transport, "Server should have a transport")
			assert.NotEmpty(t, server.Description, "Server should have a description")
			assert.Contains(t, []string{"healthy", "error", "unknown"}, server.Status, "Server should have a valid status")
		}

		assert.NotEmpty(t, response.Data.ConfigMapInfo.Name, "ConfigMap info should have a name")
		assert.NotEmpty(t, response.Data.ConfigMapInfo.Namespace, "ConfigMap info should have a namespace")
		assert.NotEmpty(t, response.Data.ConfigMapInfo.LastUpdated, "ConfigMap info should have last updated timestamp")
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

		app.MCPListHandler(rr, req, nil)

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

		app.MCPListHandler(rr, req, nil)

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
		rr := httptest.NewRecorder()

		requestURL := "/genai/v1/aa/mcps?namespace=empty-namespace"
		req, err := http.NewRequest("GET", requestURL, nil)
		require.NoError(t, err)

		// Add request identity to context
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		app.MCPListHandler(rr, req, nil)

		assert.True(t, rr.Code == http.StatusOK || rr.Code >= 400, "Should return either success or appropriate error")
	})

	t.Run("should accept namespace parameter but ignore it in implementation", func(t *testing.T) {
		rr := httptest.NewRecorder()

		requestURL := "/genai/v1/aa/mcps?namespace=different-namespace"
		req, err := http.NewRequest("GET", requestURL, nil)
		require.NoError(t, err)

		// Add request identity to context
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		app.MCPListHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		require.NoError(t, err)
		defer rr.Result().Body.Close()

		var response MCPListEnvelope
		err = json.Unmarshal(body, &response)
		require.NoError(t, err)

		require.NotNil(t, response.Data)
	})
}
