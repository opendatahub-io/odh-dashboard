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
	k8s "github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes"
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

	It("should resolve custom endpoint credentials from its Secret", func() {
		t := GinkgoT()
		var authorization string
		upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authorization = r.Header.Get("Authorization")
			w.WriteHeader(http.StatusOK)
		}))
		defer upstream.Close()

		app.kubernetesClientFactory = &proxyCredentialsK8sFactory{client: &proxyCredentialsK8sClient{
			externalModelsConfig: customEndpointConfig(upstream.URL, "custom-provider", "embedding-model", "api-secret", "token"),
			secretValue:          "custom-api-key",
		}}
		app.httpClient = upstream.Client()

		req := embeddingProxyRequest(`{"model":"custom-provider/embedding-model","input":"test"}`, "test-token")
		rr := httptest.NewRecorder()
		app.GenAIProxyNSEmbeddingsHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Equal(t, "Bearer custom-api-key", authorization)
	})

	It("should use the fake fallback key when a custom endpoint has no Secret", func() {
		t := GinkgoT()
		var authorization string
		upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authorization = r.Header.Get("Authorization")
			w.WriteHeader(http.StatusOK)
		}))
		defer upstream.Close()

		app.kubernetesClientFactory = &proxyCredentialsK8sFactory{client: &proxyCredentialsK8sClient{
			externalModelsConfig: customEndpointConfig(upstream.URL, "custom-provider", "embedding-model", "", ""),
		}}
		app.httpClient = upstream.Client()

		req := embeddingProxyRequest(`{"model":"custom-provider/embedding-model","input":"test"}`, "test-token")
		rr := httptest.NewRecorder()
		app.GenAIProxyNSEmbeddingsHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Equal(t, "Bearer fake", authorization)
	})

	It("should use the user JWT for namespace model resolution", func() {
		t := GinkgoT()
		var authorization string
		upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authorization = r.Header.Get("Authorization")
			w.WriteHeader(http.StatusOK)
		}))
		defer upstream.Close()

		app.kubernetesClientFactory = &proxyCredentialsK8sFactory{client: &proxyCredentialsK8sClient{
			externalModelsConfig: &models.ExternalModelsConfig{},
			inferenceServiceURL:  upstream.URL,
		}}
		app.httpClient = upstream.Client()

		req := embeddingProxyRequest(`{"model":"namespace-model","input":"test"}`, "user-jwt")
		rr := httptest.NewRecorder()
		app.GenAIProxyNSEmbeddingsHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Equal(t, "Bearer user-jwt", authorization)
	})

	It("should return 500 when namespace model resolution fails", func() {
		t := GinkgoT()
		app.kubernetesClientFactory = &proxyCredentialsK8sFactory{client: &proxyCredentialsK8sClient{
			externalModelsConfigErr: fmt.Errorf("external model configuration unavailable"),
			inferenceServiceErr:     fmt.Errorf("Kubernetes API unavailable"),
		}}

		req := embeddingProxyRequest(`{"model":"namespace-model","input":"test"}`, "test-token")
		rr := httptest.NewRecorder()
		app.GenAIProxyNSEmbeddingsHandler(rr, req, nil)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
	})
})

func embeddingProxyRequest(body, token string) *http.Request {
	req := httptest.NewRequest(http.MethodPost, "/api/v1/genai-proxy/ns/test-ns/v1/embeddings", strings.NewReader(body))
	ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{Token: token})
	ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "test-ns")
	return req.WithContext(ctx)
}

func customEndpointConfig(baseURL, providerID, modelID, secretName, secretKey string) *models.ExternalModelsConfig {
	return &models.ExternalModelsConfig{
		Providers: models.ProvidersConfig{Inference: []models.InferenceProvider{{
			ProviderID: providerID,
			Config: models.ProviderConfig{
				BaseURL: baseURL,
				CustomGenAI: models.CustomGenAI{APIKey: models.APIKeyConfig{SecretRef: models.SecretRef{
					Name: secretName,
					Key:  secretKey,
				}}},
			},
		}}},
		RegisteredResources: models.RegisteredResourcesConfig{Models: []models.RegisteredModel{{
			ProviderID: providerID,
			ModelID:    modelID,
		}}},
	}
}

type proxyCredentialsK8sFactory struct {
	client k8s.KubernetesClientInterface
}

func (f *proxyCredentialsK8sFactory) GetClient(context.Context) (k8s.KubernetesClientInterface, error) {
	return f.client, nil
}

func (f *proxyCredentialsK8sFactory) ExtractRequestIdentity(http.Header) (*integrations.RequestIdentity, error) {
	return &integrations.RequestIdentity{Token: "test-token"}, nil
}

func (f *proxyCredentialsK8sFactory) ValidateRequestIdentity(*integrations.RequestIdentity) error {
	return nil
}

type proxyCredentialsK8sClient struct {
	k8s.KubernetesClientInterface
	externalModelsConfig    *models.ExternalModelsConfig
	externalModelsConfigErr error
	secretValue             string
	secretErr               error
	inferenceServiceURL     string
	inferenceServiceErr     error
}

func (c *proxyCredentialsK8sClient) GetExternalModelsConfig(context.Context, string) (*models.ExternalModelsConfig, error) {
	return c.externalModelsConfig, c.externalModelsConfigErr
}

func (c *proxyCredentialsK8sClient) GetSecretValue(context.Context, *integrations.RequestIdentity, string, string, string) (string, error) {
	return c.secretValue, c.secretErr
}

func (c *proxyCredentialsK8sClient) GetInferenceServiceURL(context.Context, *integrations.RequestIdentity, string, string) (string, error) {
	return c.inferenceServiceURL, c.inferenceServiceErr
}
