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
		baseURL, token, resolvedModel, err := app.resolveModelEndpoint(ctx, constants.MaaSProviderPrefix+modelID, "test-ns", "")

		require.NoError(t, err)
		assert.Equal(t, "https://models.example.com/v1", baseURL)
		assert.Equal(t, "maas-token", token)
		// The resolved model ID strips only the "maas-" routing prefix and preserves
		// the full catalog path (the first-slash chop would have dropped "publishers/").
		assert.Equal(t, modelID, resolvedModel)
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

		req := embeddingProxyRequest(`{"model":"embedding-model","input":"test"}`, "test-token")
		rr := httptest.NewRecorder()
		app.GenAIProxyNSEmbeddingsHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Equal(t, "Bearer custom-api-key", authorization)
	})

	It("should forward namespaced custom-endpoint model IDs verbatim", func() {
		t := GinkgoT()
		var upstreamModel string
		upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			var upstreamBody struct {
				Model string `json:"model"`
			}
			require.NoError(t, json.NewDecoder(r.Body).Decode(&upstreamBody))
			upstreamModel = upstreamBody.Model
			w.WriteHeader(http.StatusOK)
		}))
		defer upstream.Close()

		app.kubernetesClientFactory = &proxyCredentialsK8sFactory{client: &proxyCredentialsK8sClient{
			externalModelsConfig: customEndpointConfig(upstream.URL, "granite-embed-provider", "RedHatAI/granite-embedding-english-r2", "", ""),
		}}
		app.httpClient = upstream.Client()

		// OGX forwards the model's provider_resource_id — the ConfigMap model_id, which
		// for namespaced (HF-style) IDs contains slashes. The upstream (e.g. vLLM) serves
		// the model under its full namespaced name, so the ID must survive verbatim.
		req := embeddingProxyRequest(`{"model":"RedHatAI/granite-embedding-english-r2","input":"test"}`, "test-token")
		rr := httptest.NewRecorder()
		app.GenAIProxyNSEmbeddingsHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Equal(t, "RedHatAI/granite-embedding-english-r2", upstreamModel)
	})

	It("should strip the passthrough routing prefix but preserve namespaced model IDs", func() {
		t := GinkgoT()
		var upstreamModel string
		upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			var upstreamBody struct {
				Model string `json:"model"`
			}
			require.NoError(t, json.NewDecoder(r.Body).Decode(&upstreamBody))
			upstreamModel = upstreamBody.Model
			w.WriteHeader(http.StatusOK)
		}))
		defer upstream.Close()

		app.kubernetesClientFactory = &proxyCredentialsK8sFactory{client: &proxyCredentialsK8sClient{
			externalModelsConfig: customEndpointConfig(upstream.URL, "granite-embed-provider", "RedHatAI/granite-embedding-english-r2", "", ""),
		}}
		app.httpClient = upstream.Client()

		req := embeddingProxyRequest(`{"model":"genai-bff-proxy/RedHatAI/granite-embedding-english-r2","input":"test"}`, "test-token")
		rr := httptest.NewRecorder()
		app.GenAIProxyNSEmbeddingsHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Equal(t, "RedHatAI/granite-embedding-english-r2", upstreamModel)
	})

	It("should resolve passthrough-prefixed IDs by native model, not provider split", func() {
		t := GinkgoT()
		// Collision fixture: provider "team" serves model "embed", while provider
		// "other-provider" serves the native namespaced model "team/embed". A
		// passthrough-prefixed ID means "the remainder is the provider-native model
		// ID", so genai-bff-proxy/team/embed must resolve to other-provider's endpoint
		// with the model forwarded verbatim — not be split into provider "team" +
		// model "embed".
		var rightHits, wrongHits int
		var upstreamModel string
		right := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			rightHits++
			var upstreamBody struct {
				Model string `json:"model"`
			}
			require.NoError(t, json.NewDecoder(r.Body).Decode(&upstreamBody))
			upstreamModel = upstreamBody.Model
			w.WriteHeader(http.StatusOK)
		}))
		defer right.Close()
		wrong := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			wrongHits++
			w.WriteHeader(http.StatusOK)
		}))
		defer wrong.Close()

		app.kubernetesClientFactory = &proxyCredentialsK8sFactory{client: &proxyCredentialsK8sClient{
			externalModelsConfig: &models.ExternalModelsConfig{
				Providers: models.ProvidersConfig{Inference: []models.InferenceProvider{
					{ProviderID: "team", Config: models.ProviderConfig{BaseURL: wrong.URL}},
					{ProviderID: "other-provider", Config: models.ProviderConfig{BaseURL: right.URL}},
				}},
				RegisteredResources: models.RegisteredResourcesConfig{Models: []models.RegisteredModel{
					{ProviderID: "team", ModelID: "embed"},
					{ProviderID: "other-provider", ModelID: "team/embed"},
				}},
			},
		}}
		app.httpClient = right.Client()

		req := embeddingProxyRequest(`{"model":"genai-bff-proxy/team/embed","input":"sensitive query"}`, "test-token")
		rr := httptest.NewRecorder()
		app.GenAIProxyNSEmbeddingsHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Equal(t, 1, rightHits, "the native model's provider must receive the request")
		assert.Equal(t, 0, wrongHits, "the colliding provider named like the model's first path segment must not receive the request")
		assert.Equal(t, "team/embed", upstreamModel)
	})

	It("should resolve custom-endpoint models whose native ID begins with maas-", func() {
		t := GinkgoT()
		// The custom-endpoint ConfigMap is the more specific registration than the
		// MaaS prefix heuristic (the embeddings path has no model-source header to
		// disambiguate), so an exact ConfigMap match must win even when the native
		// model_id begins with "maas-". With the MaaS branch checked first this
		// request would 500 ("MaaS is not available") instead of reaching the
		// configured endpoint.
		var upstreamModel string
		upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			var upstreamBody struct {
				Model string `json:"model"`
			}
			require.NoError(t, json.NewDecoder(r.Body).Decode(&upstreamBody))
			upstreamModel = upstreamBody.Model
			w.WriteHeader(http.StatusOK)
		}))
		defer upstream.Close()

		app.kubernetesClientFactory = &proxyCredentialsK8sFactory{client: &proxyCredentialsK8sClient{
			externalModelsConfig: customEndpointConfig(upstream.URL, "edge-provider", "maas-custom-embedding", "", ""),
		}}
		app.httpClient = upstream.Client()

		req := embeddingProxyRequest(`{"model":"maas-custom-embedding","input":"test"}`, "test-token")
		rr := httptest.NewRecorder()
		app.GenAIProxyNSEmbeddingsHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code, "the configured custom endpoint must win over the MaaS prefix heuristic")
		assert.Equal(t, "maas-custom-embedding", upstreamModel)
	})

	It("should resolve unprefixed IDs by native model, not provider split", func() {
		t := GinkgoT()
		// OGX forwards provider_resource_id — the bare native model ID — on every
		// path, so an unprefixed slash-containing ID is always a native ID, never a
		// provider-qualified reference. Collision fixture: provider "team" serves
		// model "embed", while provider "other-provider" serves the native namespaced
		// model "team/embed". An unprefixed "team/embed" request must resolve to
		// other-provider's endpoint with the model forwarded verbatim — not be split
		// into provider "team" + model "embed".
		var rightHits, wrongHits int
		var upstreamModel string
		right := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			rightHits++
			var upstreamBody struct {
				Model string `json:"model"`
			}
			require.NoError(t, json.NewDecoder(r.Body).Decode(&upstreamBody))
			upstreamModel = upstreamBody.Model
			w.WriteHeader(http.StatusOK)
		}))
		defer right.Close()
		wrong := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			wrongHits++
			w.WriteHeader(http.StatusOK)
		}))
		defer wrong.Close()

		app.kubernetesClientFactory = &proxyCredentialsK8sFactory{client: &proxyCredentialsK8sClient{
			externalModelsConfig: &models.ExternalModelsConfig{
				Providers: models.ProvidersConfig{Inference: []models.InferenceProvider{
					{ProviderID: "team", Config: models.ProviderConfig{BaseURL: wrong.URL}},
					{ProviderID: "other-provider", Config: models.ProviderConfig{BaseURL: right.URL}},
				}},
				RegisteredResources: models.RegisteredResourcesConfig{Models: []models.RegisteredModel{
					{ProviderID: "team", ModelID: "embed"},
					{ProviderID: "other-provider", ModelID: "team/embed"},
				}},
			},
		}}
		app.httpClient = right.Client()

		req := embeddingProxyRequest(`{"model":"team/embed","input":"sensitive query"}`, "test-token")
		rr := httptest.NewRecorder()
		app.GenAIProxyNSEmbeddingsHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Equal(t, 1, rightHits, "the native model's provider must receive the request")
		assert.Equal(t, 0, wrongHits, "the provider named like the model's first path segment must not receive the request")
		assert.Equal(t, "team/embed", upstreamModel)
	})

	It("should fail closed on unprefixed provider-qualified references", func() {
		t := GinkgoT()
		// OGX never sends this form — it forwards provider_resource_id (the bare
		// native ID) on every path — but if an unprefixed provider-qualified
		// reference ("endpoint-1/embedding-model" meaning provider endpoint-1's
		// model embedding-model) ever arrived, the native-ID lookup must miss and
		// the request must fail closed with a 404 rather than being split-matched
		// to the provider. A clean miss cannot misroute embeddings to another
		// configured endpoint.
		var upstreamHits int
		upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			upstreamHits++
			w.WriteHeader(http.StatusOK)
		}))
		defer upstream.Close()

		app.kubernetesClientFactory = &proxyCredentialsK8sFactory{client: &proxyCredentialsK8sClient{
			externalModelsConfig: customEndpointConfig(upstream.URL, "endpoint-1", "embedding-model", "", ""),
		}}
		app.httpClient = upstream.Client()

		req := embeddingProxyRequest(`{"model":"endpoint-1/embedding-model","input":"test"}`, "test-token")
		rr := httptest.NewRecorder()
		app.GenAIProxyNSEmbeddingsHandler(rr, req, nil)

		assert.Equal(t, http.StatusNotFound, rr.Code,
			"a provider-qualified reference is not a native model ID and must fail closed")
		assert.Equal(t, 0, upstreamHits, "the provider must not receive a request for a provider-qualified reference")
	})

	It("should append /v1 to base URLs that do not already end in /v1", func() {
		t := GinkgoT()
		var upstreamPath string
		upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			upstreamPath = r.URL.Path
			w.WriteHeader(http.StatusOK)
		}))
		defer upstream.Close()

		// Gemini's OpenAI-compatible base URL uses the /v1beta/openai path. The handler
		// appends /v1 per the spike findings — Google's endpoint accepts the resulting
		// /v1beta/openai/v1/embeddings path.
		app.kubernetesClientFactory = &proxyCredentialsK8sFactory{client: &proxyCredentialsK8sClient{
			externalModelsConfig: customEndpointConfig(upstream.URL+"/v1beta/openai", "gemini-embedding-provider", "gemini-embedding-001", "", ""),
		}}
		app.httpClient = upstream.Client()

		req := embeddingProxyRequest(`{"model":"gemini-embedding-001","input":"test"}`, "test-token")
		rr := httptest.NewRecorder()
		app.GenAIProxyNSEmbeddingsHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Equal(t, "/v1beta/openai/v1/embeddings", upstreamPath)
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

		req := embeddingProxyRequest(`{"model":"embedding-model","input":"test"}`, "test-token")
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
