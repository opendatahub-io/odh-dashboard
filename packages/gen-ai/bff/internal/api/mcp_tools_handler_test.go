package api

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
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

func TestMCPToolsHandler(t *testing.T) {
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
	}

	testCases := []struct {
		name                   string
		serverURL              string
		expectedStatus         string
		expectedToolsCount     int
		expectedServerName     string
		expectedErrorCode      string
		expectedStatusCode     int
		shouldHaveErrorDetails bool
	}{
		{
			name:               "successful tools retrieval from brave search server",
			serverURL:          "http://localhost:9090/sse",
			expectedStatus:     "success",
			expectedToolsCount: 2,
			expectedServerName: "brave-search-mcp-server",
			expectedStatusCode: 200,
		},
		{
			name:               "successful tools retrieval from kubernetes server",
			serverURL:          "http://localhost:9091/mcp",
			expectedStatus:     "success",
			expectedToolsCount: 2,
			expectedServerName: "kubernetes-mcp-server",
			expectedStatusCode: 200,
		},
		{
			name:               "successful tools retrieval from default transport server",
			serverURL:          "http://localhost:9092/default-transport",
			expectedStatus:     "success",
			expectedToolsCount: 1,
			expectedServerName: "default-transport-server",
			expectedStatusCode: 200,
		},
		{
			name:               "successful tools retrieval from invalid transport server",
			serverURL:          "http://localhost:9093/invalid-transport",
			expectedStatus:     "success",
			expectedToolsCount: 1,
			expectedServerName: "invalid-transport-server",
			expectedStatusCode: 200,
		},
		{
			name:                   "connection error - server unavailable",
			serverURL:              "https://mcp-unavailable:8080/sse",
			expectedStatus:         "error",
			expectedToolsCount:     0,
			expectedServerName:     "unavailable-server",
			expectedErrorCode:      "connection_error",
			expectedStatusCode:     200,
			shouldHaveErrorDetails: true,
		},
		{
			name:                   "authentication error",
			serverURL:              "https://mcp-error:8080/mcp",
			expectedStatus:         "error",
			expectedToolsCount:     0,
			expectedServerName:     "error-server",
			expectedErrorCode:      "unauthorized",
			expectedStatusCode:     200,
			shouldHaveErrorDetails: true,
		},
		{
			name:               "successful tools retrieval from github copilot server",
			serverURL:          "https://api.githubcopilot.com/mcp",
			expectedStatus:     "success",
			expectedToolsCount: 5,
			expectedServerName: "generic-mcp-server",
			expectedStatusCode: 200,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			rr := httptest.NewRecorder()

			encodedURL := url.QueryEscape(tc.serverURL)
			requestURL := "/genai/v1/mcp/tools?namespace=demo&server_url=" + encodedURL
			req, err := http.NewRequest("GET", requestURL, nil)
			require.NoError(t, err)

			ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{
				Token: "FAKE_BEARER_TOKEN",
			})
			req = req.WithContext(ctx)

			app.MCPToolsHandler(rr, req, nil)

			assert.Equal(t, tc.expectedStatusCode, rr.Code)

			body, err := io.ReadAll(rr.Result().Body)
			require.NoError(t, err)
			defer rr.Result().Body.Close()

			var response MCPToolsEnvelope
			err = json.Unmarshal(body, &response)
			require.NoError(t, err)

			require.NotNil(t, response.Data)
			assert.Equal(t, tc.expectedStatus, response.Data.Status)
			assert.Equal(t, tc.serverURL, response.Data.ServerURL)
			assert.Equal(t, tc.expectedServerName, response.Data.ServerInfo.Name)
			assert.Equal(t, tc.expectedToolsCount, len(response.Data.Tools))

			if tc.expectedStatus == "success" {
				assert.NotNil(t, response.Data.ToolsCount)
				assert.Equal(t, tc.expectedToolsCount, *response.Data.ToolsCount)
				assert.Contains(t, response.Data.Message, "Successfully retrieved")
				assert.Nil(t, response.Data.ErrorDetails)

				if tc.expectedToolsCount > 0 {
					for _, tool := range response.Data.Tools {
						assert.NotEmpty(t, tool.Name, "Tool should have a name")
						assert.NotEmpty(t, tool.Description, "Tool should have a description")
						assert.NotNil(t, tool.InputSchema, "Tool should have input schema")
					}
				}
			}

			if tc.shouldHaveErrorDetails {
				assert.NotNil(t, response.Data.ErrorDetails)
				assert.Equal(t, tc.expectedErrorCode, response.Data.ErrorDetails.Code)
				assert.Greater(t, response.Data.ErrorDetails.StatusCode, 0)
				assert.NotEmpty(t, response.Data.ErrorDetails.RawError)
				assert.Nil(t, response.Data.ToolsCount)
			}

			assert.NotEmpty(t, response.Data.ServerInfo.Version)
			if tc.expectedStatus == "success" {
				assert.NotEmpty(t, response.Data.ServerInfo.ProtocolVersion)
			}
			assert.Greater(t, response.Data.LastChecked, int64(0))
		})
	}

	t.Run("should return 400 when namespace parameter is missing", func(t *testing.T) {
		rr := httptest.NewRecorder()

		encodedURL := url.QueryEscape("http://localhost:9090/sse")
		requestURL := "/genai/v1/mcp/tools?server_url=" + encodedURL
		req, err := http.NewRequest("GET", requestURL, nil)
		require.NoError(t, err)

		// Add request identity to context
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		app.MCPToolsHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	t.Run("should return 400 when server_url parameter is missing", func(t *testing.T) {
		rr := httptest.NewRecorder()

		requestURL := "/genai/v1/mcp/tools?namespace=demo"
		req, err := http.NewRequest("GET", requestURL, nil)
		require.NoError(t, err)

		// Add request identity to context
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		app.MCPToolsHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	t.Run("should return 400 when request identity is missing", func(t *testing.T) {
		rr := httptest.NewRecorder()

		encodedURL := url.QueryEscape("http://localhost:9090/sse")
		requestURL := "/genai/v1/mcp/tools?namespace=demo&server_url=" + encodedURL
		req, err := http.NewRequest("GET", requestURL, nil)
		require.NoError(t, err)

		app.MCPToolsHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	t.Run("should return 404 when server config not found", func(t *testing.T) {
		rr := httptest.NewRecorder()

		encodedURL := url.QueryEscape("https://nonexistent-server.com/mcp")
		requestURL := "/genai/v1/mcp/tools?namespace=demo&server_url=" + encodedURL
		req, err := http.NewRequest("GET", requestURL, nil)
		require.NoError(t, err)

		// Add request identity to context
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		app.MCPToolsHandler(rr, req, nil)

		assert.Equal(t, http.StatusNotFound, rr.Code)
	})

	t.Run("should handle URL decoding correctly", func(t *testing.T) {
		rr := httptest.NewRecorder()

		serverURL := "http://localhost:9090/sse"
		encodedURL := url.QueryEscape(serverURL)
		requestURL := "/genai/v1/mcp/tools?namespace=demo&server_url=" + encodedURL
		req, err := http.NewRequest("GET", requestURL, nil)
		require.NoError(t, err)

		// Add request identity to context
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		app.MCPToolsHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		require.NoError(t, err)
		defer rr.Result().Body.Close()

		var response MCPToolsEnvelope
		err = json.Unmarshal(body, &response)
		require.NoError(t, err)

		assert.Equal(t, serverURL, response.Data.ServerURL)
	})
}
