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
	"github.com/opendatahub-io/gen-ai/internal/models"
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
			assert.NotEmpty(t, store.Name, "Store should have a name")
			assert.NotEmpty(t, store.ProviderType, "Store should have a provider type")
			assert.NotEmpty(t, store.Collection, "Store should have a collection")
			assert.NotEmpty(t, store.Embedding.ModelID, "Store should have an embedding model ID")
			assert.Greater(t, store.Embedding.Dimension, 0, "Store should have a positive embedding dimension")
		}
	})

	It("should return stores with correct embedding model availability", func() {
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

		storesByName := make(map[string]models.ExternalVectorStoreSummary)
		for _, store := range response.Data {
			storesByName[store.Name] = store
		}

		// pgvector-store and qdrant-store use ibm-granite/granite-embedding-125m-english
		// which matches the provider_model_id in the LlamaStack config
		assert.True(t, storesByName["pgvector-store"].EmbeddingModelAvailable,
			"pgvector-store should have embedding_model_available=true")
		assert.True(t, storesByName["qdrant-store"].EmbeddingModelAvailable,
			"qdrant-store should have embedding_model_available=true")

		// milvus-store uses unknown-embedding-model which is not registered
		milvus, ok := storesByName["milvus-store"]
		require.True(t, ok, "milvus-store must be present")
		assert.False(t, milvus.EmbeddingModelAvailable,
			"milvus-store should have embedding_model_available=false")
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

	It("should not expose secrets or config details", func() {
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
		assert.NotContains(t, bodyStr, "credentialSecret", "Response should not contain credentialSecret")
		assert.NotContains(t, bodyStr, "tlsSecretRef", "Response should not contain tlsSecretRef")
		assert.NotContains(t, bodyStr, "pgvector-credentials", "Response should not contain secret names")
		assert.NotContains(t, bodyStr, "connection-string", "Response should not contain secret keys")
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
