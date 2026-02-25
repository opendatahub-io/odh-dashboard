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

var _ = Describe("ExternalVectorStoresListHandler", func() {
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

	It("should return list of external vector stores", func() {
		t := GinkgoT()
		rr := httptest.NewRecorder()

		req, err := http.NewRequest("GET", "/api/v1/vectorstores/external?namespace=llama-stack", nil)
		require.NoError(t, err)

		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "llama-stack")
		req = req.WithContext(ctx)

		app.ExternalVectorStoresListHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		require.NoError(t, err)
		defer rr.Result().Body.Close()

		var response ExternalVectorStoresListEnvelope
		err = json.Unmarshal(body, &response)
		require.NoError(t, err)

		assert.Equal(t, 3, response.Data.TotalCount, "Should return 3 vector stores")
		assert.Equal(t, 3, len(response.Data.VectorStores))

		for _, store := range response.Data.VectorStores {
			assert.NotEmpty(t, store.Name, "Store should have a name")
			assert.NotEmpty(t, store.ProviderType, "Store should have a provider type")
			assert.NotEmpty(t, store.Collection, "Store should have a collection")
			assert.NotEmpty(t, store.Embedding.ModelID, "Store should have an embedding model ID")
			assert.Greater(t, store.Embedding.Dimension, 0, "Store should have a positive embedding dimension")
		}
	})

	It("should return embedding_model_available true when model is registered", func() {
		t := GinkgoT()
		rr := httptest.NewRecorder()

		req, err := http.NewRequest("GET", "/api/v1/vectorstores/external?namespace=llama-stack", nil)
		require.NoError(t, err)

		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "llama-stack")
		req = req.WithContext(ctx)

		app.ExternalVectorStoresListHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		require.NoError(t, err)
		defer rr.Result().Body.Close()

		var response ExternalVectorStoresListEnvelope
		err = json.Unmarshal(body, &response)
		require.NoError(t, err)

		// pgvector-store and qdrant-store use ibm-granite/granite-embedding-125m-english
		// which matches the provider_model_id in the LLS config
		foundAvailable := false
		for _, store := range response.Data.VectorStores {
			if store.Name == "pgvector-store" || store.Name == "qdrant-store" {
				assert.True(t, store.EmbeddingModelAvailable,
					"Store %s should have embedding_model_available=true (model ibm-granite/granite-embedding-125m-english is registered)", store.Name)
				foundAvailable = true
			}
		}
		assert.True(t, foundAvailable, "Should find at least one store with available embedding model")
	})

	It("should return embedding_model_available false when model is not registered", func() {
		t := GinkgoT()
		rr := httptest.NewRecorder()

		req, err := http.NewRequest("GET", "/api/v1/vectorstores/external?namespace=llama-stack", nil)
		require.NoError(t, err)

		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "llama-stack")
		req = req.WithContext(ctx)

		app.ExternalVectorStoresListHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		require.NoError(t, err)
		defer rr.Result().Body.Close()

		var response ExternalVectorStoresListEnvelope
		err = json.Unmarshal(body, &response)
		require.NoError(t, err)

		// milvus-store uses unknown-embedding-model which is not in the LLS config
		foundMilvus := false
		for _, store := range response.Data.VectorStores {
			if store.Name == "milvus-store" {
				foundMilvus = true
				assert.False(t, store.EmbeddingModelAvailable,
					"Store milvus-store should have embedding_model_available=false (unknown-embedding-model is not registered)")
			}
		}
		assert.True(t, foundMilvus, "milvus-store must be present in the response")
	})

	It("should return 400 when namespace parameter is missing", func() {
		t := GinkgoT()
		rr := httptest.NewRecorder()

		req, err := http.NewRequest("GET", "/api/v1/vectorstores/external", nil)
		require.NoError(t, err)

		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		app.ExternalVectorStoresListHandler(rr, req, nil)

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

		req, err := http.NewRequest("GET", "/api/v1/vectorstores/external?namespace=llama-stack", nil)
		require.NoError(t, err)

		app.ExternalVectorStoresListHandler(rr, req, nil)

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

	It("should not expose secrets or config details", func() {
		t := GinkgoT()
		rr := httptest.NewRecorder()

		req, err := http.NewRequest("GET", "/api/v1/vectorstores/external?namespace=llama-stack", nil)
		require.NoError(t, err)

		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "llama-stack")
		req = req.WithContext(ctx)

		app.ExternalVectorStoresListHandler(rr, req, nil)

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

	It("should include ConfigMap metadata", func() {
		t := GinkgoT()
		rr := httptest.NewRecorder()

		req, err := http.NewRequest("GET", "/api/v1/vectorstores/external?namespace=llama-stack", nil)
		require.NoError(t, err)

		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "llama-stack")
		req = req.WithContext(ctx)

		app.ExternalVectorStoresListHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		require.NoError(t, err)
		defer rr.Result().Body.Close()

		var response ExternalVectorStoresListEnvelope
		err = json.Unmarshal(body, &response)
		require.NoError(t, err)

		assert.Equal(t, "gen-ai-aa-vector-stores", response.Data.ConfigMapInfo.Name)
		assert.Equal(t, "llama-stack", response.Data.ConfigMapInfo.Namespace)
		assert.NotEmpty(t, response.Data.ConfigMapInfo.LastUpdated, "ConfigMap info should have last updated timestamp")
	})
})
