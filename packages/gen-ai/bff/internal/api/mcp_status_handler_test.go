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

func TestMCPStatusHandler(t *testing.T) {
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
		expectedServerName     string
		expectedErrorCode      string
		expectedStatusCode     int
		shouldHaveErrorDetails bool
		shouldHavePingTime     bool
	}{
		{
			name:               "successful connection to brave search server",
			serverURL:          "http://localhost:9090/sse",
			expectedStatus:     "connected",
			expectedServerName: "brave-search-mcp-server",
			expectedStatusCode: 200,
			shouldHavePingTime: true,
		},
		{
			name:               "successful connection to kubernetes server",
			serverURL:          "http://localhost:9091/mcp",
			expectedStatus:     "connected",
			expectedServerName: "kubernetes-mcp-server",
			expectedStatusCode: 200,
			shouldHavePingTime: true,
		},
		{
			name:               "successful connection to default transport server",
			serverURL:          "http://localhost:9092/default-transport",
			expectedStatus:     "connected",
			expectedServerName: "default-transport-server",
			expectedStatusCode: 200,
			shouldHavePingTime: true,
		},
		{
			name:               "successful connection to invalid transport server",
			serverURL:          "http://localhost:9093/invalid-transport",
			expectedStatus:     "connected",
			expectedServerName: "invalid-transport-server",
			expectedStatusCode: 200,
			shouldHavePingTime: true,
		},
		{
			name:                   "connection error - server unavailable",
			serverURL:              "https://mcp-unavailable:8080/sse",
			expectedStatus:         "error",
			expectedServerName:     "unavailable-server",
			expectedErrorCode:      "connection_error",
			expectedStatusCode:     200,
			shouldHaveErrorDetails: true,
			shouldHavePingTime:     false,
		},
		{
			name:                   "authentication error",
			serverURL:              "https://mcp-error:8080/mcp",
			expectedStatus:         "error",
			expectedServerName:     "error-server",
			expectedErrorCode:      "unauthorized",
			expectedStatusCode:     200,
			shouldHaveErrorDetails: true,
			shouldHavePingTime:     false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			rr := httptest.NewRecorder()

			// URL encode the server URL for the query parameter
			encodedURL := url.QueryEscape(tc.serverURL)
			requestURL := "/genai/v1/mcp/status?namespace=demo&server_url=" + encodedURL
			req, err := http.NewRequest("GET", requestURL, nil)
			require.NoError(t, err)

			// Add request identity to context
			ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{
				Token: "FAKE_BEARER_TOKEN",
			})
			req = req.WithContext(ctx)

			app.MCPStatusHandler(rr, req, nil)

			assert.Equal(t, tc.expectedStatusCode, rr.Code)

			body, err := io.ReadAll(rr.Result().Body)
			require.NoError(t, err)
			defer rr.Result().Body.Close()

			var response MCPStatusEnvelope
			err = json.Unmarshal(body, &response)
			require.NoError(t, err)

			require.NotNil(t, response.Data)
			assert.Equal(t, tc.expectedStatus, response.Data.Status)
			assert.Equal(t, tc.serverURL, response.Data.ServerURL)
			assert.Equal(t, tc.expectedServerName, response.Data.ServerInfo.Name)

			if tc.expectedStatus == "connected" {
				assert.Contains(t, response.Data.Message, "Connection successful")
				assert.Nil(t, response.Data.ErrorDetails)
			}

			if tc.shouldHaveErrorDetails {
				assert.NotNil(t, response.Data.ErrorDetails)
				assert.Equal(t, tc.expectedErrorCode, response.Data.ErrorDetails.Code)
				assert.Greater(t, response.Data.ErrorDetails.StatusCode, 0)
				assert.NotEmpty(t, response.Data.ErrorDetails.RawError)
			}

			if tc.shouldHavePingTime {
				assert.NotNil(t, response.Data.PingResponseTimeMs)
				assert.Greater(t, *response.Data.PingResponseTimeMs, int64(0))
			} else {
				assert.Nil(t, response.Data.PingResponseTimeMs)
			}

			// Verify server info structure
			assert.NotEmpty(t, response.Data.ServerInfo.Version)
			if tc.expectedStatus == "connected" {
				assert.NotEmpty(t, response.Data.ServerInfo.ProtocolVersion)
			}
			assert.Greater(t, response.Data.LastChecked, int64(0))
		})
	}

	t.Run("should return 400 when namespace parameter is missing", func(t *testing.T) {
		rr := httptest.NewRecorder()

		encodedURL := url.QueryEscape("http://localhost:9090/sse")
		requestURL := "/genai/v1/mcp/status?server_url=" + encodedURL
		req, err := http.NewRequest("GET", requestURL, nil)
		require.NoError(t, err)

		// Add request identity to context
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		app.MCPStatusHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	t.Run("should return 400 when server_url parameter is missing", func(t *testing.T) {
		rr := httptest.NewRecorder()

		requestURL := "/genai/v1/mcp/status?namespace=demo"
		req, err := http.NewRequest("GET", requestURL, nil)
		require.NoError(t, err)

		// Add request identity to context
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		app.MCPStatusHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	t.Run("should return 400 when request identity is missing", func(t *testing.T) {
		rr := httptest.NewRecorder()

		encodedURL := url.QueryEscape("http://localhost:9090/sse")
		requestURL := "/genai/v1/mcp/status?namespace=demo&server_url=" + encodedURL
		req, err := http.NewRequest("GET", requestURL, nil)
		require.NoError(t, err)

		// Don't add request identity to context

		app.MCPStatusHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	t.Run("should return 404 when server config not found", func(t *testing.T) {
		rr := httptest.NewRecorder()

		// Use a server URL that won't be found in the mock ConfigMap
		encodedURL := url.QueryEscape("https://nonexistent-server.com/mcp")
		requestURL := "/genai/v1/mcp/status?namespace=demo&server_url=" + encodedURL
		req, err := http.NewRequest("GET", requestURL, nil)
		require.NoError(t, err)

		// Add request identity to context
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		app.MCPStatusHandler(rr, req, nil)

		assert.Equal(t, http.StatusNotFound, rr.Code)
	})

	t.Run("should handle URL decoding correctly", func(t *testing.T) {
		rr := httptest.NewRecorder()

		// Test with a URL that needs proper decoding
		serverURL := "http://localhost:9090/sse"
		encodedURL := url.QueryEscape(serverURL)
		requestURL := "/genai/v1/mcp/status?namespace=demo&server_url=" + encodedURL
		req, err := http.NewRequest("GET", requestURL, nil)
		require.NoError(t, err)

		// Add request identity to context
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		app.MCPStatusHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		require.NoError(t, err)
		defer rr.Result().Body.Close()

		var response MCPStatusEnvelope
		err = json.Unmarshal(body, &response)
		require.NoError(t, err)

		assert.Equal(t, serverURL, response.Data.ServerURL)
	})

	t.Run("should verify server info consistency between status and tools endpoints", func(t *testing.T) {
		// This test ensures both endpoints return consistent server information
		testServerURL := "http://localhost:9091/mcp"
		encodedURL := url.QueryEscape(testServerURL)

		// Test status endpoint
		statusRR := httptest.NewRecorder()
		statusReq, err := http.NewRequest("GET", "/genai/v1/mcp/status?namespace=demo&server_url="+encodedURL, nil)
		require.NoError(t, err)
		statusCtx := context.WithValue(statusReq.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		statusReq = statusReq.WithContext(statusCtx)

		app.MCPStatusHandler(statusRR, statusReq, nil)
		assert.Equal(t, http.StatusOK, statusRR.Code)

		statusBody, err := io.ReadAll(statusRR.Result().Body)
		require.NoError(t, err)
		defer statusRR.Result().Body.Close()

		var statusResponse MCPStatusEnvelope
		err = json.Unmarshal(statusBody, &statusResponse)
		require.NoError(t, err)

		// Test tools endpoint
		toolsRR := httptest.NewRecorder()
		toolsReq, err := http.NewRequest("GET", "/genai/v1/mcp/tools?namespace=demo&server_url="+encodedURL, nil)
		require.NoError(t, err)
		toolsCtx := context.WithValue(toolsReq.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		toolsReq = toolsReq.WithContext(toolsCtx)

		app.MCPToolsHandler(toolsRR, toolsReq, nil)
		assert.Equal(t, http.StatusOK, toolsRR.Code)

		toolsBody, err := io.ReadAll(toolsRR.Result().Body)
		require.NoError(t, err)
		defer toolsRR.Result().Body.Close()

		var toolsResponse MCPToolsEnvelope
		err = json.Unmarshal(toolsBody, &toolsResponse)
		require.NoError(t, err)

		// Verify server info consistency
		assert.Equal(t, statusResponse.Data.ServerInfo.Name, toolsResponse.Data.ServerInfo.Name)
		assert.Equal(t, statusResponse.Data.ServerInfo.Version, toolsResponse.Data.ServerInfo.Version)
		assert.Equal(t, statusResponse.Data.ServerInfo.ProtocolVersion, toolsResponse.Data.ServerInfo.ProtocolVersion)
		assert.Equal(t, statusResponse.Data.ServerURL, toolsResponse.Data.ServerURL)
	})
}
