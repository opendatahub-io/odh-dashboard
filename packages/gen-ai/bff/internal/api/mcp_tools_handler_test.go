package api

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"

	. "github.com/onsi/ginkgo/v2"
	"github.com/opendatahub-io/gen-ai/internal/config"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/bffclient"
	"github.com/opendatahub-io/gen-ai/internal/integrations/bffclient/bffmocks"
	"github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes/k8smocks"
	"github.com/opendatahub-io/gen-ai/internal/integrations/mcp/mcpmocks"
	"github.com/opendatahub-io/gen-ai/internal/repositories"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var _ = Describe("MCPToolsHandler", func() {
	var (
		app           *App
		mockBFFClient *bffmocks.MockBFFClient
	)

	BeforeEach(func() {
		logger := slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{Level: slog.LevelDebug}))

		mockMCPFactory := mcpmocks.NewMockedMCPClientFactory(
			config.EnvConfig{MockK8sClient: true},
			logger,
		)

		mockK8sFactory, err := k8smocks.NewTokenClientFactory(testK8sClient, testCfg, logger)
		require.NoError(GinkgoT(), err)

		mockBFFFactory := bffmocks.NewMockClientFactory(logger).(*bffmocks.MockClientFactory)
		mockBFFFactory.CreateClient(bffclient.BFFTargetMLflow, "")
		mockBFFClient = mockBFFFactory.GetMockClient(bffclient.BFFTargetMLflow)
		mockBFFClient.CallHandler = nil

		app = &App{
			config: config.EnvConfig{
				Port:       4000,
				AuthMethod: "user_token",
			},
			logger:                  logger,
			repositories:            repositories.NewRepositoriesWithMCP(mockMCPFactory, logger),
			kubernetesClientFactory: mockK8sFactory,
			mcpClientFactory:        mockMCPFactory,
			bffClientFactory:        mockBFFFactory,
			dashboardNamespace:      "opendatahub",
		}
	})

	It("should handle all tool retrieval cases", func() {
		t := GinkgoT()

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
				expectedToolsCount: 40,
				expectedServerName: "generic-mcp-server",
				expectedStatusCode: 200,
			},
		}

		for _, tc := range testCases {
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
		}
	})

	It("should return 400 when namespace parameter is missing", func() {
		t := GinkgoT()
		rr := httptest.NewRecorder()

		encodedURL := url.QueryEscape("http://localhost:9090/sse")
		requestURL := "/genai/v1/mcp/tools?server_url=" + encodedURL
		req, err := http.NewRequest("GET", requestURL, nil)
		require.NoError(t, err)

		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		app.MCPToolsHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	It("should return 400 when server_url and server_name are missing", func() {
		t := GinkgoT()
		rr := httptest.NewRecorder()

		requestURL := "/genai/v1/mcp/tools?namespace=demo"
		req, err := http.NewRequest("GET", requestURL, nil)
		require.NoError(t, err)

		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		app.MCPToolsHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	It("should resolve registry server by server_name and return live tools", func() {
		t := GinkgoT()
		serverURL := "http://localhost:9091/mcp"
		mockBFFClient.CallHandler = func(_ context.Context, _, path string, _ interface{}, response interface{}) error {
			assert.Equal(t, "/mcp-registry/servers/com.example/kubernetes?workspace=demo", path)
			return marshalToResponse(map[string]interface{}{
				"data": map[string]interface{}{
					"name": "com.example/kubernetes",
					"access_endpoints": []map[string]interface{}{
						{
							"endpoint_url":   serverURL,
							"transport_type": "streamable-http",
						},
					},
				},
			}, response)
		}

		rr := httptest.NewRecorder()
		req, err := http.NewRequest("GET", "/genai/v1/mcp/tools?namespace=demo&server_name=com.example/kubernetes", nil)
		require.NoError(t, err)
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		app.MCPToolsHandler(rr, req, nil)
		assert.Equal(t, http.StatusOK, rr.Code)

		var response MCPToolsEnvelope
		require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &response))
		assert.Equal(t, "success", response.Data.Status)
		assert.Equal(t, serverURL, response.Data.ServerURL)
	})

	It("should return 404 for registry server_name with no access endpoint", func() {
		t := GinkgoT()
		mockBFFClient.CallHandler = func(_ context.Context, _, _ string, _ interface{}, response interface{}) error {
			return marshalToResponse(map[string]interface{}{
				"data": map[string]interface{}{
					"name":             "com.brave.example/brave",
					"access_endpoints": []map[string]interface{}{},
				},
			}, response)
		}

		rr := httptest.NewRecorder()
		req, err := http.NewRequest("GET", "/genai/v1/mcp/tools?namespace=demo&server_name=com.brave.example/brave", nil)
		require.NoError(t, err)
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		app.MCPToolsHandler(rr, req, nil)
		assert.Equal(t, http.StatusNotFound, rr.Code)
	})

	It("should return 503 when registry resolution requires MLflow BFF but it is unavailable", func() {
		t := GinkgoT()
		app.bffClientFactory = nil

		rr := httptest.NewRecorder()
		req, err := http.NewRequest("GET", "/genai/v1/mcp/tools?namespace=demo&server_name=com.example/kubernetes", nil)
		require.NoError(t, err)
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		app.MCPToolsHandler(rr, req, nil)
		assert.Equal(t, http.StatusServiceUnavailable, rr.Code)
	})

	It("should return 400 for invalid registry server_name with empty path segment", func() {
		t := GinkgoT()

		rr := httptest.NewRecorder()
		req, err := http.NewRequest("GET", "/genai/v1/mcp/tools?namespace=demo&server_name=com.example//kubernetes", nil)
		require.NoError(t, err)
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		app.MCPToolsHandler(rr, req, nil)
		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	It("should return 400 when request identity is missing", func() {
		t := GinkgoT()
		rr := httptest.NewRecorder()

		encodedURL := url.QueryEscape("http://localhost:9090/sse")
		requestURL := "/genai/v1/mcp/tools?namespace=demo&server_url=" + encodedURL
		req, err := http.NewRequest("GET", requestURL, nil)
		require.NoError(t, err)

		app.MCPToolsHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	It("should return 404 when server config not found", func() {
		t := GinkgoT()
		rr := httptest.NewRecorder()

		encodedURL := url.QueryEscape("https://nonexistent-server.com/mcp")
		requestURL := "/genai/v1/mcp/tools?namespace=demo&server_url=" + encodedURL
		req, err := http.NewRequest("GET", requestURL, nil)
		require.NoError(t, err)

		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		app.MCPToolsHandler(rr, req, nil)

		assert.Equal(t, http.StatusNotFound, rr.Code)
	})

	It("should handle URL decoding correctly", func() {
		t := GinkgoT()
		rr := httptest.NewRecorder()

		serverURL := "http://localhost:9090/sse"
		encodedURL := url.QueryEscape(serverURL)
		requestURL := "/genai/v1/mcp/tools?namespace=demo&server_url=" + encodedURL
		req, err := http.NewRequest("GET", requestURL, nil)
		require.NoError(t, err)

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
})

var _ = Describe("ResolveRegistryServerConfig", func() {
	var (
		app           *App
		mockBFFClient *bffmocks.MockBFFClient
	)

	BeforeEach(func() {
		logger := slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{Level: slog.LevelDebug}))
		mockFactory := bffmocks.NewMockClientFactory(logger).(*bffmocks.MockClientFactory)
		mockFactory.CreateClient(bffclient.BFFTargetMLflow, "")
		mockBFFClient = mockFactory.GetMockClient(bffclient.BFFTargetMLflow)
		app = &App{logger: logger}
	})

	It("returns config when server has an access endpoint", func() {
		t := GinkgoT()
		serverURL := "https://kubernetes-mcp.example.com/mcp"
		mockBFFClient.CallHandler = func(_ context.Context, method, path string, _ interface{}, response interface{}) error {
			assert.Equal(t, "GET", method)
			assert.Equal(t, "/mcp-registry/servers/com.example/kubernetes?workspace=default", path)
			return marshalToResponse(map[string]interface{}{
				"data": map[string]interface{}{
					"name": "com.example/kubernetes",
					"access_endpoints": []map[string]interface{}{
						{
							"endpoint_url":   serverURL,
							"transport_type": "streamable-http",
						},
					},
				},
			}, response)
		}

		cfg, err := app.resolveRegistryServerConfig(context.Background(), "default", "com.example/kubernetes", mockBFFClient)
		require.NoError(t, err)
		assert.Equal(t, serverURL, cfg.URL)
		assert.Equal(t, "streamable-http", cfg.Transport)
	})

	It("returns not found when server has no access endpoint", func() {
		t := GinkgoT()
		mockBFFClient.CallHandler = func(_ context.Context, _, _ string, _ interface{}, response interface{}) error {
			return marshalToResponse(map[string]interface{}{
				"data": map[string]interface{}{
					"name":             "com.brave.example/brave",
					"access_endpoints": []map[string]interface{}{},
				},
			}, response)
		}

		_, err := app.resolveRegistryServerConfig(context.Background(), "default", "com.brave.example/brave", mockBFFClient)
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrRegistryMCPServerNotFound)
	})

	It("returns not found when MLflow BFF reports missing server", func() {
		t := GinkgoT()
		mockBFFClient.CallHandler = func(_ context.Context, _, _ string, _ interface{}, _ interface{}) error {
			return bffclient.NewNotFoundError(bffclient.BFFTargetMLflow, "not found")
		}

		_, err := app.resolveRegistryServerConfig(context.Background(), "default", "foo/bar", mockBFFClient)
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrRegistryMCPServerNotFound)
	})

	It("returns unavailable when MLflow BFF client is nil", func() {
		t := GinkgoT()
		_, err := app.resolveRegistryServerConfig(context.Background(), "default", "foo/bar", nil)
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrRegistryMCPClientUnavailable)
	})
})

var _ = Describe("McpRegistryServerNamePathSegment", func() {
	It("escapes each path segment while preserving slashes", func() {
		t := GinkgoT()
		got, err := mcpRegistryServerNamePathSegment("com.example/kubernetes")
		require.NoError(t, err)
		assert.Equal(t, "com.example/kubernetes", got)
	})

	It("rejects empty path segments", func() {
		t := GinkgoT()
		_, err := mcpRegistryServerNamePathSegment("com.example//kubernetes")
		require.Error(t, err)
	})
})

var _ = Describe("ParseMCPToolsStatusParams", func() {
	It("requires namespace and one of server_url or server_name", func() {
		t := GinkgoT()
		app := &App{}

		req := httptest.NewRequest("GET", "/test?namespace=demo&server_name=com.example/kubernetes", nil)
		namespace, serverURL, decodedURL, serverName, err := app.parseMCPToolsStatusParams(req)
		require.NoError(t, err)
		assert.Equal(t, "demo", namespace)
		assert.Empty(t, serverURL)
		assert.Empty(t, decodedURL)
		assert.Equal(t, "com.example/kubernetes", serverName)

		req = httptest.NewRequest("GET", "/test?namespace=demo", nil)
		_, _, _, _, err = app.parseMCPToolsStatusParams(req)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "server_url or server_name parameter is required")
	})
})
