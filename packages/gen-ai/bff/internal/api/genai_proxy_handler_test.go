package api

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"

	"github.com/julienschmidt/httprouter"
	. "github.com/onsi/ginkgo/v2"
	"github.com/opendatahub-io/gen-ai/internal/config"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/bffclient"
	"github.com/opendatahub-io/gen-ai/internal/integrations/bffclient/bffmocks"
	k8smocks "github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes/k8smocks"
	"github.com/opendatahub-io/gen-ai/internal/repositories"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var _ = Describe("GenAIProxyNSModelsHandler", func() {
	var app App

	BeforeEach(func() {
		app = NewK8sLSTestApp()
	})

	It("should return OpenAI-compatible model list with models from namespace", func() {
		t := GinkgoT()
		req := httptest.NewRequest(http.MethodGet, "/gen-ai/api/v1/genai-proxy/ns/mock-test-namespace-1/v1/models", nil)

		identity := &integrations.RequestIdentity{Token: "test-token"}
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		req = req.WithContext(ctx)

		params := httprouter.Params{{Key: "namespace", Value: "mock-test-namespace-1"}}
		rr := httptest.NewRecorder()
		app.GenAIProxyNSModelsHandler(rr, req, params)

		assert.Equal(t, http.StatusOK, rr.Code)

		var response openAIModelList
		err := json.Unmarshal(rr.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Equal(t, "list", response.Object)
		require.NotEmpty(t, response.Data, "mock-test-namespace-1 should return models")

		// Verify all returned models have required OpenAI fields
		for _, model := range response.Data {
			assert.NotEmpty(t, model.ID)
			assert.Equal(t, "model", model.Object)
			assert.NotEmpty(t, model.OwnedBy)
		}
	})

	It("should return empty list when no models available", func() {
		t := GinkgoT()
		req := httptest.NewRequest(http.MethodGet, "/gen-ai/api/v1/genai-proxy/ns/empty-test-namespace/v1/models", nil)

		identity := &integrations.RequestIdentity{Token: "test-token"}
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		req = req.WithContext(ctx)

		params := httprouter.Params{{Key: "namespace", Value: "empty-test-namespace"}}
		rr := httptest.NewRecorder()
		app.GenAIProxyNSModelsHandler(rr, req, params)

		assert.Equal(t, http.StatusOK, rr.Code)

		var response openAIModelList
		err := json.Unmarshal(rr.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Equal(t, "list", response.Object)
		assert.NotNil(t, response.Data)
		assert.Empty(t, response.Data)
	})

	It("should filter out stopped models", func() {
		t := GinkgoT()
		// mock-test-namespace-2 has mistral-7b-instruct with Status: "Stop"
		req := httptest.NewRequest(http.MethodGet, "/gen-ai/api/v1/genai-proxy/ns/mock-test-namespace-2/v1/models", nil)

		identity := &integrations.RequestIdentity{Token: "test-token"}
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		req = req.WithContext(ctx)

		params := httprouter.Params{{Key: "namespace", Value: "mock-test-namespace-2"}}
		rr := httptest.NewRecorder()
		app.GenAIProxyNSModelsHandler(rr, req, params)

		assert.Equal(t, http.StatusOK, rr.Code)

		var response openAIModelList
		err := json.Unmarshal(rr.Body.Bytes(), &response)
		require.NoError(t, err)

		// Verify the stopped model (mistral-7b-instruct) is filtered out
		for _, model := range response.Data {
			assert.NotEqual(t, "mistral-7b-instruct", model.ID, "stopped model should be filtered out")
		}
		// Verify other models from this namespace ARE present
		assert.NotEmpty(t, response.Data, "non-stopped models should still be returned")
	})

	It("should return 401 without auth identity", func() {
		req := httptest.NewRequest(http.MethodGet, "/gen-ai/api/v1/genai-proxy/ns/mock-test-namespace-1/v1/models", nil)

		// No identity in context — OGX always forwards JWT via forward_headers
		params := httprouter.Params{{Key: "namespace", Value: "mock-test-namespace-1"}}
		rr := httptest.NewRecorder()
		app.GenAIProxyNSModelsHandler(rr, req, params)

		assert.Equal(GinkgoT(), http.StatusUnauthorized, rr.Code)
	})

	It("should include custom_metadata with model_type for embedding models", func() {
		t := GinkgoT()
		req := httptest.NewRequest(http.MethodGet, "/gen-ai/api/v1/genai-proxy/ns/mock-test-namespace-2/v1/models", nil)

		identity := &integrations.RequestIdentity{Token: "test-token"}
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		req = req.WithContext(ctx)

		params := httprouter.Params{{Key: "namespace", Value: "mock-test-namespace-2"}}
		rr := httptest.NewRecorder()
		app.GenAIProxyNSModelsHandler(rr, req, params)

		assert.Equal(t, http.StatusOK, rr.Code)

		var response openAIModelList
		err := json.Unmarshal(rr.Body.Bytes(), &response)
		require.NoError(t, err)
		require.NotEmpty(t, response.Data, "mock-test-namespace-2 should have models")

		// Find the known embedding model and verify its metadata
		var foundEmbedding bool
		for _, model := range response.Data {
			if model.ID == "custom-embedding-model" {
				foundEmbedding = true
				require.NotNil(t, model.CustomMetadata, "embedding model must have custom_metadata")
				assert.Equal(t, "embedding", model.CustomMetadata["model_type"])
				assert.Equal(t, float64(768), model.CustomMetadata["embedding_dimension"])
			}
		}
		assert.True(t, foundEmbedding, "expected custom-embedding-model in response")
	})

	It("should aggregate namespace and MaaS models when BFF client is configured", func() {
		t := GinkgoT()

		// Build an App with bffClientFactory so MaaS models are fetched
		k8sFactory, err := k8smocks.NewTokenClientFactory(testK8sClient, testCfg, slog.Default())
		require.NoError(t, err)
		bffFactory := bffmocks.NewMockClientFactory(slog.Default())
		appWithMaaS := App{
			config:                  config.EnvConfig{Port: 4000},
			logger:                  slog.Default(),
			kubernetesClientFactory: k8sFactory,
			repositories:            repositories.NewRepositories(),
			bffClientFactory:        bffFactory,
		}

		req := httptest.NewRequest(http.MethodGet, "/gen-ai/api/v1/genai-proxy/ns/mock-test-namespace-1/v1/models", nil)
		identity := &integrations.RequestIdentity{Token: "test-token"}
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		// Inject MaaS client into context (as the handler does internally)
		maasClient := bffFactory.CreateClient(bffclient.BFFTargetMaaS, identity.Token)
		ctx = context.WithValue(ctx, constants.BFFClientKey(constants.BFFTarget(bffclient.BFFTargetMaaS)), maasClient)
		req = req.WithContext(ctx)

		params := httprouter.Params{{Key: "namespace", Value: "mock-test-namespace-1"}}
		rr := httptest.NewRecorder()
		appWithMaaS.GenAIProxyNSModelsHandler(rr, req, params)

		assert.Equal(t, http.StatusOK, rr.Code)

		var response openAIModelList
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		require.NoError(t, err)

		// Should have namespace models (from mock-test-namespace-1: 2 LLM-D models)
		// plus any MaaS models from the mock BFF client
		require.GreaterOrEqual(t, len(response.Data), 2, "should have at least namespace models")

		// Verify known namespace models are present
		modelIDs := make(map[string]bool)
		for _, model := range response.Data {
			assert.NotEmpty(t, model.ID)
			assert.Equal(t, "model", model.Object)
			modelIDs[model.ID] = true
		}
		assert.True(t, modelIDs["llm-d-codestral-22b"], "expected namespace model llm-d-codestral-22b")
		assert.True(t, modelIDs["llm-d-deepseek-coder-33b"], "expected namespace model llm-d-deepseek-coder-33b")
	})
})
