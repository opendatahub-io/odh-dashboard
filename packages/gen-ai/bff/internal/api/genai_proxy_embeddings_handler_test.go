package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"

	"github.com/julienschmidt/httprouter"
	. "github.com/onsi/ginkgo/v2"
	"github.com/opendatahub-io/gen-ai/internal/cache"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/bffclient"
	"github.com/opendatahub-io/gen-ai/internal/integrations/bffclient/bffmocks"
	"github.com/opendatahub-io/gen-ai/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var _ = Describe("GenAIProxyNSEmbeddingsHandler", func() {
	var app App

	BeforeEach(func() {
		app = NewK8sLSTestApp()
	})

	It("should return 401 without auth identity", func() {
		body := `{"model": "some-model", "input": "hello"}`
		req := httptest.NewRequest(http.MethodPost, "/api/v1/genai-proxy/ns/test-ns/v1/embeddings", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")

		params := httprouter.Params{{Key: "namespace", Value: "test-ns"}}
		rr := httptest.NewRecorder()
		app.GenAIProxyNSEmbeddingsHandler(rr, req, params)

		assert.Equal(GinkgoT(), http.StatusUnauthorized, rr.Code)
	})

	It("should return 400 when model field is missing", func() {
		t := GinkgoT()
		body := `{"input": "hello world"}`
		req := httptest.NewRequest(http.MethodPost, "/api/v1/genai-proxy/ns/test-ns/v1/embeddings", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")

		identity := &integrations.RequestIdentity{Token: "test-token"}
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		req = req.WithContext(ctx)

		params := httprouter.Params{{Key: "namespace", Value: "test-ns"}}
		rr := httptest.NewRecorder()
		app.GenAIProxyNSEmbeddingsHandler(rr, req, params)

		assert.Equal(t, http.StatusBadRequest, rr.Code)

		var errResp map[string]interface{}
		err := json.Unmarshal(rr.Body.Bytes(), &errResp)
		require.NoError(t, err)
		assert.Contains(t, errResp["error"].(map[string]interface{})["message"], "model")
	})

	It("should return 400 for invalid JSON body", func() {
		t := GinkgoT()
		body := `{invalid json`
		req := httptest.NewRequest(http.MethodPost, "/api/v1/genai-proxy/ns/test-ns/v1/embeddings", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")

		identity := &integrations.RequestIdentity{Token: "test-token"}
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		req = req.WithContext(ctx)

		params := httprouter.Params{{Key: "namespace", Value: "test-ns"}}
		rr := httptest.NewRecorder()
		app.GenAIProxyNSEmbeddingsHandler(rr, req, params)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	It("should return 404 when model is not found", func() {
		t := GinkgoT()
		body := `{"model": "nonexistent-model", "input": "hello"}`
		req := httptest.NewRequest(http.MethodPost, "/api/v1/genai-proxy/ns/test-ns/v1/embeddings", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")

		identity := &integrations.RequestIdentity{Token: "test-token"}
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "test-ns")
		req = req.WithContext(ctx)

		params := httprouter.Params{{Key: "namespace", Value: "test-ns"}}
		rr := httptest.NewRecorder()
		app.GenAIProxyNSEmbeddingsHandler(rr, req, params)

		assert.Equal(t, http.StatusNotFound, rr.Code)
	})

	It("should resolve MaaS model IDs without their routing prefix", func() {
		t := GinkgoT()
		modelID := "publishers/example/models/embedding"
		mockFactory := bffmocks.NewMockClientFactory(app.logger).(*bffmocks.MockClientFactory)
		mockClient := mockFactory.CreateClient(bffclient.BFFTargetMaaS, "test-token").(*bffmocks.MockBFFClient)
		mockClient.CallHandler = func(_ context.Context, method, path string, _ interface{}, response interface{}) error {
			switch {
			case method == http.MethodGet && path == "/models":
				*response.(*models.MaaSBFFModelsResponse) = models.MaaSBFFModelsResponse{
					Data: models.MaaSBFFModelsData{Data: []models.MaaSBFFModel{{ID: modelID, URL: "https://models.example.com"}}},
				}
				return nil
			case method == http.MethodPost && path == "/api-keys":
				response.(*models.MaaSBFFAPIKeyResponse).Data.Key = "maas-token"
				return nil
			default:
				return fmt.Errorf("unexpected MaaS BFF call: %s %s", method, path)
			}
		}
		app.bffClientFactory = mockFactory
		app.memoryStore = cache.NewMemoryStore()

		ctx := context.WithValue(context.Background(), constants.RequestIdentityKey, &integrations.RequestIdentity{Token: "test-token"})
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "test-ns")
		baseURL, token, err := app.resolveModelEndpoint(ctx, constants.MaaSProviderPrefix+modelID, "test-ns", "")

		require.NoError(t, err)
		assert.Equal(t, "https://models.example.com/v1", baseURL)
		assert.Equal(t, "maas-token", token)
		_, found := app.memoryStore.Get("test-ns", "mockUser", constants.CacheAccessTokensCategory, maasTokenCacheKey(modelID, ""))
		assert.True(t, found, "the MaaS token cache key should use the unprefixed model ID")
	})
})
