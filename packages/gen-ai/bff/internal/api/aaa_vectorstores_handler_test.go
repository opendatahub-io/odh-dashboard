package api

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"

	. "github.com/onsi/ginkgo/v2"
	"github.com/opendatahub-io/gen-ai/internal/config"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes/k8smocks"
	"github.com/opendatahub-io/gen-ai/internal/integrations/mcp/mcpmocks"
	"github.com/opendatahub-io/gen-ai/internal/repositories"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var _ = Describe("VectorStoresAAHandler", func() {
	var app *App

	BeforeEach(func() {
		logger := slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{Level: slog.LevelDebug}))

		mockMCPFactory := mcpmocks.NewMockedMCPClientFactory(
			config.EnvConfig{MockK8sClient: true},
			logger,
		)

		mockK8sFactory, err := k8smocks.NewTokenClientFactory(testK8sClient, testCfg, logger)
		require.NoError(GinkgoT(), err)

		app = &App{
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
	})

	It("should return list of vector stores as AA assets", func() {
		t := GinkgoT()
		rr := httptest.NewRecorder()

		req, err := http.NewRequest("GET", "/gen-ai/api/v1/aaa/vectorstores?namespace=llama-stack", nil)
		require.NoError(t, err)

		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "llama-stack")
		req = req.WithContext(ctx)

		app.VectorStoresAAHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		require.NoError(t, err)
		defer rr.Result().Body.Close()

		var response VectorStoresAAEnvelope
		err = json.Unmarshal(body, &response)
		require.NoError(t, err)

		assert.Len(t, response.Data, 3, "Should return 3 vector stores from the ConfigMap")

		for _, store := range response.Data {
			assert.NotEmpty(t, store.VectorStoreID, "Store should have a vector_store_id")
			assert.NotEmpty(t, store.VectorStoreName, "Store should have a vector_store_name")
			assert.NotEmpty(t, store.ProviderID, "Store should have a provider_id")
			assert.NotEmpty(t, store.ProviderType, "Store should have a provider_type")
			assert.NotEmpty(t, store.EmbeddingModel, "Store should have an embedding_model")
			assert.Greater(t, store.EmbeddingDimension, 0, "Store should have a positive embedding_dimension")
		}
	})

	It("should return stores from mock-test namespaces", func() {
		t := GinkgoT()
		rr := httptest.NewRecorder()

		req, err := http.NewRequest("GET", "/gen-ai/api/v1/aaa/vectorstores?namespace=mock-test-namespace-1", nil)
		require.NoError(t, err)

		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "mock-test-namespace-1")
		req = req.WithContext(ctx)

		app.VectorStoresAAHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		require.NoError(t, err)
		defer rr.Result().Body.Close()

		var response VectorStoresAAEnvelope
		err = json.Unmarshal(body, &response)
		require.NoError(t, err)

		assert.Len(t, response.Data, 3, "mock-test-namespace-1 should have the same 3 vector stores from its ConfigMap")
	})

	It("should not include ConfigMap metadata in the response", func() {
		t := GinkgoT()
		rr := httptest.NewRecorder()

		req, err := http.NewRequest("GET", "/gen-ai/api/v1/aaa/vectorstores?namespace=llama-stack", nil)
		require.NoError(t, err)

		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "llama-stack")
		req = req.WithContext(ctx)

		app.VectorStoresAAHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		require.NoError(t, err)
		defer rr.Result().Body.Close()

		bodyStr := string(body)
		assert.NotContains(t, bodyStr, "config_map_info", "AA response should not include config_map_info")
		assert.NotContains(t, bodyStr, "total_count", "AA response should not include total_count")
	})

	It("should not expose secrets or provider config details", func() {
		t := GinkgoT()
		rr := httptest.NewRecorder()

		req, err := http.NewRequest("GET", "/gen-ai/api/v1/aaa/vectorstores?namespace=llama-stack", nil)
		require.NoError(t, err)

		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "llama-stack")
		req = req.WithContext(ctx)

		app.VectorStoresAAHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		require.NoError(t, err)
		defer rr.Result().Body.Close()

		bodyStr := string(body)
		assert.NotContains(t, bodyStr, "secretRefs", "Response should not contain secretRefs")
		assert.NotContains(t, bodyStr, "pgvector-credentials", "Response should not contain secret names")
		assert.NotContains(t, bodyStr, "qdrant-credentials", "Response should not contain secret names")
		assert.NotContains(t, bodyStr, `"config"`, "Response should not contain config block")
	})

	It("should return 400 when namespace parameter is missing", func() {
		t := GinkgoT()
		rr := httptest.NewRecorder()

		req, err := http.NewRequest("GET", "/gen-ai/api/v1/aaa/vectorstores", nil)
		require.NoError(t, err)

		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		app.VectorStoresAAHandler(rr, req, nil)

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

		req, err := http.NewRequest("GET", "/gen-ai/api/v1/aaa/vectorstores?namespace=llama-stack", nil)
		require.NoError(t, err)

		app.VectorStoresAAHandler(rr, req, nil)

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
})
