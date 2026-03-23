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
			assert.NotEmpty(t, store.VectorStoreID, "Store should have a vector_store_id")
			assert.NotEmpty(t, store.VectorStoreName, "Store should have a vector_store_name")
			assert.NotEmpty(t, store.ProviderType, "Store should have a provider_type")
			assert.NotEmpty(t, store.EmbeddingModel, "Store should have an embedding_model")
			assert.Greater(t, store.EmbeddingDimension, 0, "Store should have a positive embedding_dimension")
		}
	})

	It("should resolve provider_type from provider section", func() {
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

		storesByID := make(map[string]models.ExternalVectorStoreSummary)
		for _, store := range response.Data.VectorStores {
			storesByID[store.VectorStoreID] = store
		}

		// pgvector store should have resolved provider_type
		pgStore := storesByID["vs_282695f8-7e3e-48da-abac-d81a0aa225a4"]
		assert.Equal(t, "remote::pgvector", pgStore.ProviderType, "pgvector store should have correct provider_type")

		// qdrant store should have resolved provider_type
		qdrantStore := storesByID["vs_4c4b74e3-30ac-4e46-9057-213154f83dba"]
		assert.Equal(t, "remote::qdrant", qdrantStore.ProviderType, "qdrant store should have correct provider_type")

		// milvus store should have resolved provider_type
		milvusStore := storesByID["vs_a2607363-cea0-4d2a-8a93-7fb76863403b"]
		assert.Equal(t, "remote::milvus", milvusStore.ProviderType, "milvus store should have correct provider_type")
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

	It("should not expose secrets or provider config details", func() {
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
		assert.NotContains(t, bodyStr, "secretRefs", "Response should not contain secretRefs")
		assert.NotContains(t, bodyStr, "pgvector-credentials", "Response should not contain secret names")
		assert.NotContains(t, bodyStr, "qdrant-credentials", "Response should not contain secret names")
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
