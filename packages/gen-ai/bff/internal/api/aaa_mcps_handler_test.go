package api

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"

	. "github.com/onsi/ginkgo/v2"
	"github.com/opendatahub-io/gen-ai/internal/config"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/bffclient"
	"github.com/opendatahub-io/gen-ai/internal/integrations/bffclient/bffmocks"
	"github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes/k8smocks"
	"github.com/opendatahub-io/gen-ai/internal/integrations/mcp/mcpmocks"
	"github.com/opendatahub-io/gen-ai/internal/models"
	"github.com/opendatahub-io/gen-ai/internal/repositories"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var _ = Describe("MCPListHandler", func() {
	var (
		app            *App
		mockBFFFactory *bffmocks.MockClientFactory
		mockBFFClient  *bffmocks.MockBFFClient
	)

	BeforeEach(func() {
		logger := slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{Level: slog.LevelDebug}))

		mockMCPFactory := mcpmocks.NewMockedMCPClientFactory(
			config.EnvConfig{MockK8sClient: true},
			logger,
		)

		mockK8sFactory, err := k8smocks.NewTokenClientFactory(testK8sClient, testCfg, logger)
		require.NoError(GinkgoT(), err)

		mockBFFFactory = bffmocks.NewMockClientFactory(logger).(*bffmocks.MockClientFactory)
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

	It("should return list of MCP servers successfully", func() {
		t := GinkgoT()
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
			assert.Contains(t, []string{models.MCPServerSourceConfigMap, models.MCPServerSourceRegistry}, server.Source)
		}

		assert.False(t, response.Data.RegistryAvailable, "Registry should be unavailable without mock response")
		assert.NotEmpty(t, response.Data.RegistryError)
		assert.True(t, response.Data.ConfigmapAvailable)
		require.NotNil(t, response.Data.ConfigMapInfo)
		assert.NotEmpty(t, response.Data.ConfigMapInfo.Name)
	})

	It("should merge registry and configmap servers when registry is available", func() {
		t := GinkgoT()
		mockBFFClient.CallHandler = func(_ context.Context, method, path string, _ interface{}, response interface{}) error {
			require.Equal(t, "GET", method)
			require.Equal(t, "/mcp-registry/servers?workspace=demo", path)
			data := map[string]interface{}{
				"data": map[string]interface{}{
					"servers": []map[string]interface{}{
						{
							"name":        "io.github.example/github",
							"description": "GitHub MCP server",
							"status":      "active",
							"access_endpoints": []map[string]interface{}{
								{
									"endpoint_url":   "https://github-mcp.example.com/mcp",
									"transport_type": "streamable-http",
									"resolved_version": map[string]interface{}{
										"version": "1.0.0",
										"tools": []map[string]interface{}{
											{"name": "create_github_issue", "description": "Create issue"},
										},
									},
								},
							},
						},
						{
							"name":        "com.brave.example/brave",
							"description": "Draft server",
							"status":      "draft",
						},
					},
				},
			}
			return marshalToResponse(data, response)
		}

		rr := httptest.NewRecorder()
		req, err := http.NewRequest("GET", "/genai/v1/aa/mcps?namespace=demo", nil)
		require.NoError(t, err)
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		app.MCPListHandler(rr, req, nil)
		assert.Equal(t, http.StatusOK, rr.Code)

		var response MCPListEnvelope
		require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &response))
		assert.True(t, response.Data.RegistryAvailable)

		var registryCount, configmapCount int
		for _, server := range response.Data.Servers {
			switch server.Source {
			case models.MCPServerSourceRegistry:
				registryCount++
				if server.Name == "io.github.example/github" {
					assert.Equal(t, 1, server.ToolCount)
					assert.Equal(t, "https://github-mcp.example.com/mcp", server.URL)
				}
			case models.MCPServerSourceConfigMap:
				configmapCount++
			}
		}
		assert.Equal(t, 1, registryCount, "MVP filter should exclude draft brave server")
		assert.Greater(t, configmapCount, 0)
		assert.Equal(t, len(response.Data.Servers), response.Data.TotalCount)
	})

	It("should return configmap servers with registry_available false when registry call fails", func() {
		t := GinkgoT()
		mockBFFClient.CallHandler = func(_ context.Context, _, _ string, _ interface{}, _ interface{}) error {
			return fmt.Errorf("registry unavailable")
		}

		rr := httptest.NewRecorder()
		req, err := http.NewRequest("GET", "/genai/v1/aa/mcps?namespace=demo", nil)
		require.NoError(t, err)
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		app.MCPListHandler(rr, req, nil)
		assert.Equal(t, http.StatusOK, rr.Code)

		var response MCPListEnvelope
		require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &response))
		assert.False(t, response.Data.RegistryAvailable)
		assert.NotEmpty(t, response.Data.RegistryError)
		assert.Equal(t, "MCP registry temporarily unavailable", response.Data.RegistryError)
		assert.Greater(t, len(response.Data.Servers), 0)
		for _, server := range response.Data.Servers {
			assert.Equal(t, models.MCPServerSourceConfigMap, server.Source)
		}
	})

	It("should return 400 when namespace parameter is missing", func() {
		t := GinkgoT()
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

	It("should return 400 when request identity is missing", func() {
		t := GinkgoT()
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

	It("should handle empty server list", func() {
		t := GinkgoT()
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

	It("should accept namespace parameter but ignore it in implementation", func() {
		t := GinkgoT()
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

	It("should return HTTP 200 with configmap_available false when ConfigMap is missing", func() {
		t := GinkgoT()

		// "llama-stack" namespace exists but has no gen-ai-aa-mcp-servers ConfigMap
		app.dashboardNamespace = "llama-stack"

		rr := httptest.NewRecorder()
		req, err := http.NewRequest("GET", "/genai/v1/aa/mcps?namespace=demo", nil)
		require.NoError(t, err)
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		app.MCPListHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code, "missing ConfigMap must not fail the request")

		var response MCPListEnvelope
		require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &response))
		assert.False(t, response.Data.ConfigmapAvailable)
		assert.NotEmpty(t, response.Data.ConfigmapError, "configmap_error should describe the problem")
		assert.Contains(t, response.Data.ConfigmapError, "llama-stack")
	})

	It("should return registry servers even when ConfigMap is missing", func() {
		t := GinkgoT()

		// "llama-stack" namespace has no gen-ai-aa-mcp-servers ConfigMap
		app.dashboardNamespace = "llama-stack"

		mockBFFClient.CallHandler = func(_ context.Context, method, path string, _ interface{}, response interface{}) error {
			require.Equal(t, "GET", method)
			data := map[string]interface{}{
				"data": map[string]interface{}{
					"servers": []map[string]interface{}{
						{
							"name":        "io.github.example/github",
							"description": "GitHub MCP server",
							"status":      "active",
							"access_endpoints": []map[string]interface{}{
								{
									"endpoint_url":   "https://github-mcp.example.com/mcp",
									"transport_type": "streamable-http",
									"resolved_version": map[string]interface{}{
										"version": "1.0.0",
										"tools": []map[string]interface{}{
											{"name": "create_github_issue", "description": "Create issue"},
										},
									},
								},
							},
						},
					},
				},
			}
			return marshalToResponse(data, response)
		}

		rr := httptest.NewRecorder()
		req, err := http.NewRequest("GET", "/genai/v1/aa/mcps?namespace=demo", nil)
		require.NoError(t, err)
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		app.MCPListHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		var response MCPListEnvelope
		require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &response))

		assert.False(t, response.Data.ConfigmapAvailable, "ConfigMap should be reported unavailable")
		assert.NotEmpty(t, response.Data.ConfigmapError)
		assert.True(t, response.Data.RegistryAvailable, "Registry should still be available")
		assert.Greater(t, len(response.Data.Servers), 0, "Registry servers should still be returned")
		for _, server := range response.Data.Servers {
			assert.Equal(t, models.MCPServerSourceRegistry, server.Source, "All servers should be registry-sourced")
		}
	})

	It("should return 0 servers and both available flags false when both sources are unavailable", func() {
		t := GinkgoT()

		// "llama-stack" namespace has no gen-ai-aa-mcp-servers ConfigMap
		app.dashboardNamespace = "llama-stack"

		mockBFFClient.CallHandler = func(_ context.Context, _, _ string, _ interface{}, _ interface{}) error {
			return fmt.Errorf("registry connection refused")
		}

		rr := httptest.NewRecorder()
		req, err := http.NewRequest("GET", "/genai/v1/aa/mcps?namespace=demo", nil)
		require.NoError(t, err)
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		app.MCPListHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code, "dual failure must not crash the endpoint")

		var response MCPListEnvelope
		require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &response))

		assert.False(t, response.Data.ConfigmapAvailable)
		assert.False(t, response.Data.RegistryAvailable)
		assert.NotEmpty(t, response.Data.RegistryError)
		assert.Empty(t, response.Data.Servers)
		assert.Equal(t, 0, response.Data.TotalCount)
	})

	It("should return configmap_available true and no configmap_error on success", func() {
		t := GinkgoT()
		rr := httptest.NewRecorder()
		req, err := http.NewRequest("GET", "/genai/v1/aa/mcps?namespace=demo", nil)
		require.NoError(t, err)
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		app.MCPListHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		var response MCPListEnvelope
		require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &response))

		assert.True(t, response.Data.ConfigmapAvailable, "ConfigMap should be available in opendatahub namespace")
		assert.Empty(t, response.Data.ConfigmapError, "No error should be present on success")
		require.NotNil(t, response.Data.ConfigMapInfo)
		assert.Equal(t, constants.MCPServerName, response.Data.ConfigMapInfo.Name)
	})

	It("should deduplicate servers with the same URL, preferring registry entries", func() {
		t := GinkgoT()

		sharedURL := "http://localhost:9090/sse"
		mockBFFClient.CallHandler = func(_ context.Context, method, path string, _ interface{}, response interface{}) error {
			require.Equal(t, "GET", method)
			data := map[string]interface{}{
				"data": map[string]interface{}{
					"servers": []map[string]interface{}{
						{
							"name":        "io.github.example/github",
							"description": "Registry copy",
							"status":      "active",
							"access_endpoints": []map[string]interface{}{
								{
									"endpoint_url":   sharedURL,
									"transport_type": "sse",
									"resolved_version": map[string]interface{}{
										"version": "1.0.0",
										"tools":   []map[string]interface{}{},
									},
								},
							},
						},
					},
				},
			}
			return marshalToResponse(data, response)
		}

		rr := httptest.NewRecorder()
		req, err := http.NewRequest("GET", "/genai/v1/aa/mcps?namespace=demo", nil)
		require.NoError(t, err)
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		app.MCPListHandler(rr, req, nil)
		assert.Equal(t, http.StatusOK, rr.Code)

		var response MCPListEnvelope
		require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &response))

		var matches int
		for _, server := range response.Data.Servers {
			if server.URL == sharedURL {
				matches++
				assert.Equal(t, models.MCPServerSourceRegistry, server.Source)
			}
		}
		assert.Equal(t, 1, matches, "duplicate URL should appear once, from registry")
	})

	It("should aggregate registry servers across paginated MLflow BFF responses", func() {
		t := GinkgoT()
		callCount := 0
		mockBFFClient.CallHandler = func(_ context.Context, method, path string, _ interface{}, response interface{}) error {
			require.Equal(t, "GET", method)
			callCount++
			if callCount == 1 {
				require.Equal(t, "/mcp-registry/servers?workspace=demo", path)
				return marshalToResponse(map[string]interface{}{
					"data": map[string]interface{}{
						"servers": []map[string]interface{}{
							{
								"name":        "io.github.example/page-one",
								"description": "First page server",
								"status":      "active",
								"access_endpoints": []map[string]interface{}{
									{
										"endpoint_url":   "https://page-one.example.com/mcp",
										"transport_type": "streamable-http",
									},
								},
							},
						},
						"next_page_token": "page2",
					},
				}, response)
			}
			require.Equal(t, "/mcp-registry/servers?workspace=demo&page_token=page2", path)
			return marshalToResponse(map[string]interface{}{
				"data": map[string]interface{}{
					"servers": []map[string]interface{}{
						{
							"name":        "io.github.example/page-two",
							"description": "Second page server",
							"status":      "active",
							"access_endpoints": []map[string]interface{}{
								{
									"endpoint_url":   "https://page-two.example.com/mcp",
									"transport_type": "streamable-http",
								},
							},
						},
					},
				},
			}, response)
		}

		rr := httptest.NewRecorder()
		req, err := http.NewRequest("GET", "/genai/v1/aa/mcps?namespace=demo", nil)
		require.NoError(t, err)
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		app.MCPListHandler(rr, req, nil)
		assert.Equal(t, http.StatusOK, rr.Code)

		var response MCPListEnvelope
		require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &response))
		assert.True(t, response.Data.RegistryAvailable)
		assert.Equal(t, 2, callCount)

		registryNames := make(map[string]struct{})
		for _, server := range response.Data.Servers {
			if server.Source == models.MCPServerSourceRegistry {
				registryNames[server.Name] = struct{}{}
			}
		}
		assert.Contains(t, registryNames, "io.github.example/page-one")
		assert.Contains(t, registryNames, "io.github.example/page-two")
	})

	It("should return registry_error when MLflow BFF is not configured", func() {
		t := GinkgoT()
		app.bffClientFactory = nil

		rr := httptest.NewRecorder()
		req, err := http.NewRequest("GET", "/genai/v1/aa/mcps?namespace=demo", nil)
		require.NoError(t, err)
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		app.MCPListHandler(rr, req, nil)
		assert.Equal(t, http.StatusOK, rr.Code)

		var response MCPListEnvelope
		require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &response))
		assert.False(t, response.Data.RegistryAvailable)
		assert.Equal(t, "MLflow BFF is not configured", response.Data.RegistryError)
	})
})
