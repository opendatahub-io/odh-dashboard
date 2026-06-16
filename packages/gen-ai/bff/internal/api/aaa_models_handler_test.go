package api

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"

	"log/slog"

	. "github.com/onsi/ginkgo/v2"
	"github.com/opendatahub-io/gen-ai/internal/config"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/bffclient"
	"github.com/opendatahub-io/gen-ai/internal/integrations/bffclient/bffmocks"
	"github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes/k8smocks"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack/lsmocks"
	"github.com/opendatahub-io/gen-ai/internal/models"
	"github.com/opendatahub-io/gen-ai/internal/repositories"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var _ = Describe("ModelsAAHandler", func() {
	var app App

	BeforeEach(func() {
		k8sFactory, err := k8smocks.NewTokenClientFactory(testK8sClient, testCfg, slog.Default())
		require.NoError(GinkgoT(), err)

		llamaStackClientFactory := lsmocks.NewMockClientFactory()
		app = App{
			config: config.EnvConfig{
				Port: 4000,
			},
			logger:                  slog.Default(),
			kubernetesClientFactory: k8sFactory,
			llamaStackClientFactory: llamaStackClientFactory,
			repositories:            repositories.NewRepositories(),
		}
	})

	It("should return 200 with AA models data when models are found", func() {
		t := GinkgoT()
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/models/aa", nil)
		assert.NoError(t, err)

		ctx := context.Background()
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "mock-test-namespace-2")
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()

		app.ModelsAAHandler(rr, req, nil)

		rs := rr.Result()
		defer func() { _ = rs.Body.Close() }()

		body, err := io.ReadAll(rs.Body)
		assert.NoError(t, err)

		var response map[string]interface{}
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		assert.Equal(t, http.StatusOK, rr.Code)

		data, exists := response["data"]
		assert.True(t, exists, "Response should contain 'data' field")

		dataArray, ok := data.([]interface{})
		assert.True(t, ok, "Data should be an array")
		assert.GreaterOrEqual(t, len(dataArray), 8, "Should return at least 8 mock AA models for mock-test-namespace-2 (5 InferenceService + 3 LLMInferenceService, plus any external models)")

		firstModel, ok := dataArray[0].(map[string]interface{})
		assert.True(t, ok, "First model should be a map")
		assert.Equal(t, "granite-7b-code", firstModel["model_name"])
		assert.Equal(t, "OpenVINO Model Server", firstModel["serving_runtime"])
		assert.Equal(t, "v2", firstModel["api_protocol"])
		assert.Equal(t, "v2025.1", firstModel["version"])
		assert.Equal(t, "Code generation", firstModel["usecase"])
		assert.Equal(t, "IBM Granite 7B model specialized for code generation tasks", firstModel["description"])
		assert.Equal(t, "Running", firstModel["status"])

		capabilities, ok := firstModel["capabilities"].([]interface{})
		assert.True(t, ok, "capabilities should be an array")
		assert.Equal(t, []interface{}{"text-generation"}, capabilities,
			"namespace models default to text-generation capability")

		endpoints, ok := firstModel["endpoints"].([]interface{})
		assert.True(t, ok, "Endpoints should be an array")
		assert.Len(t, endpoints, 2, "Should have 2 endpoints")
		assert.Equal(t, "internal: http://granite-7b-code.mock-test-namespace-2.svc.cluster.local:8080", endpoints[0])
		assert.Equal(t, "external: https://granite-7b-code-mock-test-namespace-2.example.com", endpoints[1])

		secondModel, ok := dataArray[1].(map[string]interface{})
		assert.True(t, ok, "Second model should be a map")
		assert.Equal(t, "llama-3.1-8b-instruct", secondModel["model_name"])
		assert.Equal(t, "TorchServe", secondModel["serving_runtime"])
		assert.Equal(t, "v1", secondModel["api_protocol"])
		assert.Equal(t, "v2025.1", secondModel["version"])
		assert.Equal(t, "General chat", secondModel["usecase"])
		assert.Equal(t, "Meta Llama 3.1 8B parameter model optimized for instruction following", secondModel["description"])
		assert.Equal(t, "Running", secondModel["status"])

		secondEndpoints, ok := secondModel["endpoints"].([]interface{})
		assert.True(t, ok, "Second model endpoints should be an array")
		assert.Len(t, secondEndpoints, 2, "Should have 2 endpoints")
		assert.Equal(t, "internal: http://llama-3.1-8b-instruct.mock-test-namespace-2.svc.cluster.local:8080", secondEndpoints[0])
		assert.Equal(t, "external: https://llama-3.1-8b-instruct-mock-test-namespace-2.example.com", secondEndpoints[1])

		thirdModel, ok := dataArray[2].(map[string]interface{})
		assert.True(t, ok, "Third model should be a map")
		assert.Equal(t, "mistral-7b-instruct", thirdModel["model_name"])
		assert.Equal(t, "TorchServe", thirdModel["serving_runtime"])
		assert.Equal(t, "v1", thirdModel["api_protocol"])
		assert.Equal(t, "v2025.1", thirdModel["version"])
		assert.Equal(t, "Multilingual, Reasoning", thirdModel["usecase"])
		assert.Equal(t, "Mistral 7B instruction-tuned model for general purpose tasks", thirdModel["description"])
		assert.Equal(t, "Stop", thirdModel["status"])

		thirdEndpoints, ok := thirdModel["endpoints"].([]interface{})
		assert.True(t, ok, "Third model endpoints should be an array")
		assert.Len(t, thirdEndpoints, 1, "Should have 1 endpoint")
		assert.Equal(t, "internal: http://mistral-7b-instruct.mock-test-namespace-2.svc.cluster.local:8080", thirdEndpoints[0])

		fourthModel, ok := dataArray[3].(map[string]interface{})
		assert.True(t, ok, "Fourth model should be a map")
		assert.Equal(t, "ollama/llama3.2:3b", fourthModel["model_name"])
		assert.Equal(t, "Ollama", fourthModel["serving_runtime"])
		assert.Equal(t, "v1", fourthModel["api_protocol"])
		assert.Equal(t, "v2025.1", fourthModel["version"])
		assert.Equal(t, "General chat, Code generation", fourthModel["usecase"])
		assert.Equal(t, "Meta Llama 3.2 3B parameter model optimized for efficiency and performance", fourthModel["description"])
		assert.Equal(t, "Running", fourthModel["status"])

		fifthModel, ok := dataArray[4].(map[string]interface{})
		assert.True(t, ok, "Fifth model should be a map")
		assert.Equal(t, "ollama/all-minilm:l6-v2", fifthModel["model_name"])
		assert.Equal(t, "Ollama", fifthModel["serving_runtime"])
		assert.Equal(t, "v1", fifthModel["api_protocol"])
		assert.Equal(t, "v2025.1", fifthModel["version"])
		assert.Equal(t, "Embeddings, Semantic search", fifthModel["usecase"])
		assert.Equal(t, "Microsoft All-MiniLM-L6-v2 embedding model for semantic search and text similarity", fifthModel["description"])
		assert.Equal(t, "Running", fifthModel["status"])
	})

	It("should return error when namespace is missing from context", func() {
		t := GinkgoT()
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/models/aa", nil)
		assert.NoError(t, err)

		rr := httptest.NewRecorder()

		app.ModelsAAHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)

		var response map[string]interface{}
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)

		errorData, exists := response["error"]
		assert.True(t, exists, "Response should contain 'error' field")

		errorMap, ok := errorData.(map[string]interface{})
		assert.True(t, ok, "Error should be a map")

		assert.Equal(t, "400", errorMap["code"])
		assert.Contains(t, errorMap["message"], "missing namespace in the context")
	})

	It("should return error when RequestIdentity is missing from context", func() {
		t := GinkgoT()
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/models/aa", nil)
		assert.NoError(t, err)

		ctx := context.WithValue(context.Background(), constants.NamespaceQueryParameterKey, "mock-test-namespace-1")
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()

		app.ModelsAAHandler(rr, req, nil)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)

		var response map[string]interface{}
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)

		errorData, exists := response["error"]
		assert.True(t, exists, "Response should contain 'error' field")

		errorMap, ok := errorData.(map[string]interface{})
		assert.True(t, ok, "Error should be a map")

		assert.Equal(t, "401", errorMap["code"])
		assert.Contains(t, errorMap["message"], "missing RequestIdentity in context")
	})
})

var _ = Describe("parseModelSourcesFromTokens", func() {
	It("should return default sources when input is empty", func() {
		t := GinkgoT()
		sources, invalid := parseModelSourcesFromTokens([]string{})

		assert.True(t, sources[models.ModelSourceTypeNamespace], "Should include namespace by default")
		assert.True(t, sources[models.ModelSourceTypeCustomEndpoint], "Should include custom_endpoint by default")
		assert.False(t, sources[models.ModelSourceTypeMaaS], "Should not include maas by default")
		assert.Empty(t, invalid, "Should have no invalid sources")
	})

	It("should parse single source: namespace", func() {
		t := GinkgoT()
		sources, invalid := parseModelSourcesFromTokens([]string{"namespace"})

		assert.True(t, sources[models.ModelSourceTypeNamespace])
		assert.False(t, sources[models.ModelSourceTypeCustomEndpoint])
		assert.False(t, sources[models.ModelSourceTypeMaaS])
		assert.Empty(t, invalid)
	})

	It("should parse single source: custom_endpoint", func() {
		t := GinkgoT()
		sources, invalid := parseModelSourcesFromTokens([]string{"custom_endpoint"})

		assert.False(t, sources[models.ModelSourceTypeNamespace])
		assert.True(t, sources[models.ModelSourceTypeCustomEndpoint])
		assert.False(t, sources[models.ModelSourceTypeMaaS])
		assert.Empty(t, invalid)
	})

	It("should parse single source: maas", func() {
		t := GinkgoT()
		sources, invalid := parseModelSourcesFromTokens([]string{"maas"})

		assert.False(t, sources[models.ModelSourceTypeNamespace])
		assert.False(t, sources[models.ModelSourceTypeCustomEndpoint])
		assert.True(t, sources[models.ModelSourceTypeMaaS])
		assert.Empty(t, invalid)
	})

	It("should parse multiple sources: namespace,maas", func() {
		t := GinkgoT()
		sources, invalid := parseModelSourcesFromTokens([]string{"namespace", "maas"})

		assert.True(t, sources[models.ModelSourceTypeNamespace])
		assert.False(t, sources[models.ModelSourceTypeCustomEndpoint])
		assert.True(t, sources[models.ModelSourceTypeMaaS])
		assert.Empty(t, invalid)
	})

	It("should parse multiple sources: custom_endpoint,maas", func() {
		t := GinkgoT()
		sources, invalid := parseModelSourcesFromTokens([]string{"custom_endpoint", "maas"})

		assert.False(t, sources[models.ModelSourceTypeNamespace])
		assert.True(t, sources[models.ModelSourceTypeCustomEndpoint])
		assert.True(t, sources[models.ModelSourceTypeMaaS])
		assert.Empty(t, invalid)
	})

	It("should parse all sources: namespace,custom_endpoint,maas", func() {
		t := GinkgoT()
		sources, invalid := parseModelSourcesFromTokens([]string{"namespace", "custom_endpoint", "maas"})

		assert.True(t, sources[models.ModelSourceTypeNamespace])
		assert.True(t, sources[models.ModelSourceTypeCustomEndpoint])
		assert.True(t, sources[models.ModelSourceTypeMaaS])
		assert.Empty(t, invalid)
	})

	It("should return invalid sources", func() {
		t := GinkgoT()
		sources, invalid := parseModelSourcesFromTokens([]string{"namespace", "invalid", "maas"})

		assert.True(t, sources[models.ModelSourceTypeNamespace])
		assert.False(t, sources[models.ModelSourceTypeCustomEndpoint])
		assert.True(t, sources[models.ModelSourceTypeMaaS])
		assert.Contains(t, invalid, "invalid", "Should track invalid source")
		assert.Len(t, invalid, 1, "Should have exactly 1 invalid source")
	})

	It("should handle duplicates", func() {
		t := GinkgoT()
		sources, invalid := parseModelSourcesFromTokens([]string{"namespace", "namespace", "maas"})

		assert.True(t, sources[models.ModelSourceTypeNamespace])
		assert.True(t, sources[models.ModelSourceTypeMaaS])
		assert.Contains(t, invalid, "namespace (duplicate)")
	})
})

var _ = Describe("getMaaSModelStatus", func() {
	It("should return Running when model is ready", func() {
		t := GinkgoT()
		status := getMaaSModelStatus(true)
		assert.Equal(t, models.ModelStatusRunning, status)
	})

	It("should return Stop when model is not ready", func() {
		t := GinkgoT()
		status := getMaaSModelStatus(false)
		assert.Equal(t, models.ModelStatusStop, status)
	})
})

var _ = Describe("fetchMaaSModels", func() {
	var app App
	var mockClientFactory *bffmocks.MockClientFactory

	BeforeEach(func() {
		mockClientFactory = bffmocks.NewMockClientFactory(slog.Default()).(*bffmocks.MockClientFactory)
		app = App{
			config: config.EnvConfig{Port: 4000},
			logger: slog.Default(),
		}
	})

	It("should successfully fetch and convert MaaS models to AAModel format", func() {
		t := GinkgoT()

		// Create mock MaaS client
		mockMaaSClient := mockClientFactory.CreateClient(bffclient.BFFTargetMaaS, "test-token")

		// Add client to context
		ctx := context.WithValue(context.Background(), constants.BFFClientKey(constants.BFFTarget(bffclient.BFFTargetMaaS)), mockMaaSClient)

		// Fetch MaaS models
		aaModels, err := app.fetchMaaSModels(ctx, "test-namespace")

		assert.NoError(t, err)
		assert.NotNil(t, aaModels)
		assert.GreaterOrEqual(t, len(aaModels), 5, "Should return at least 5 mock MaaS models")

		// Verify first model conversion
		firstModel := aaModels[0]
		assert.Equal(t, "llama-2-7b-chat", firstModel.ModelName)
		assert.Equal(t, "llama-2-7b-chat", firstModel.ModelID)
		assert.Equal(t, models.ModelSourceTypeMaaS, firstModel.ModelSourceType)
		assert.Equal(t, models.ModelStatusRunning, firstModel.Status)
		assert.Equal(t, "model-namespace", firstModel.ServingRuntime)
		assert.Len(t, firstModel.Endpoints, 1)
		assert.Equal(t, "https://llama-2-7b-chat.apps.example.openshift.com/v1", firstModel.Endpoints[0])

		// Verify third model (not ready)
		thirdModel := aaModels[2]
		assert.Equal(t, "llama-3-8b-instruct", thirdModel.ModelName)
		assert.Equal(t, models.ModelStatusStop, thirdModel.Status)
	})

	It("should return error when MaaS BFF client is not available in context", func() {
		t := GinkgoT()

		// Context without BFF client
		ctx := context.Background()

		aaModels, err := app.fetchMaaSModels(ctx, "test-namespace")

		assert.Error(t, err)
		assert.Nil(t, aaModels)
		assert.Contains(t, err.Error(), "Target BFF service is not available")
	})

	It("should return error when MaaS BFF call fails", func() {
		t := GinkgoT()

		// Create mock MaaS client with custom error handler
		mockMaaSClient := bffmocks.NewMockBFFClient(bffclient.BFFTargetMaaS)
		mockMaaSClient.CallHandler = func(ctx context.Context, method, path string, body interface{}, response interface{}) error {
			return bffclient.NewBFFClientError(bffclient.ErrCodeInternalError, "mock BFF error", 500)
		}

		// Add client to context
		ctx := context.WithValue(context.Background(), constants.BFFClientKey(constants.BFFTarget(bffclient.BFFTargetMaaS)), mockMaaSClient)

		aaModels, err := app.fetchMaaSModels(ctx, "test-namespace")

		assert.Error(t, err)
		assert.Nil(t, aaModels)
		// Error is returned unwrapped from Call - check for BFFClientError details
		assert.Contains(t, err.Error(), "mock BFF error")
	})

	It("should handle MaaS models with ModelDetails correctly", func() {
		t := GinkgoT()

		// Create mock MaaS client with custom response including model details
		mockMaaSClient := bffmocks.NewMockBFFClient(bffclient.BFFTargetMaaS)
		mockMaaSClient.CallHandler = func(ctx context.Context, method, path string, body interface{}, response interface{}) error {
			maasResp := models.MaaSBFFModelsResponse{
				Data: models.MaaSBFFModelsData{
					Object: "list",
					Data: []models.MaaSBFFModel{
						{
							ID:        "test-model-with-details",
							Ready:     true,
							URL:       "https://test.example.com/v1",
							OwnedBy:   "test-runtime",
							ModelType: "llm",
							ModelDetails: &models.MaaSBFFModelDetails{
								DisplayName:  "Test Display Name",
								Description:  "Test Description",
								GenAIUseCase: "Test Use Case",
							},
						},
					},
				},
			}

			// Marshal to response
			respBytes, _ := json.Marshal(maasResp)
			return json.Unmarshal(respBytes, response)
		}

		// Add client to context
		ctx := context.WithValue(context.Background(), constants.BFFClientKey(constants.BFFTarget(bffclient.BFFTargetMaaS)), mockMaaSClient)

		aaModels, err := app.fetchMaaSModels(ctx, "test-namespace")

		assert.NoError(t, err)
		assert.Len(t, aaModels, 1)

		model := aaModels[0]
		assert.Equal(t, "Test Display Name", model.DisplayName)
		assert.Equal(t, "Test Description", model.Description)
		assert.Equal(t, "Test Use Case", model.Usecase)
		assert.Equal(t, models.ModelTypeLLM, model.ModelType)
	})
})

var _ = Describe("ModelsAAHandler with sources query parameter", func() {
	var app App
	var mockClientFactory *bffmocks.MockClientFactory

	BeforeEach(func() {
		k8sFactory, err := k8smocks.NewTokenClientFactory(testK8sClient, testCfg, slog.Default())
		require.NoError(GinkgoT(), err)

		llamaStackClientFactory := lsmocks.NewMockClientFactory()
		mockClientFactory = bffmocks.NewMockClientFactory(slog.Default()).(*bffmocks.MockClientFactory)

		app = App{
			config: config.EnvConfig{
				Port: 4000,
			},
			logger:                  slog.Default(),
			kubernetesClientFactory: k8sFactory,
			llamaStackClientFactory: llamaStackClientFactory,
			repositories:            repositories.NewRepositories(),
			bffClientFactory:        mockClientFactory,
		}
	})

	It("should return namespace and custom_endpoint models by default (no sources param)", func() {
		t := GinkgoT()
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/models/aa", nil)
		assert.NoError(t, err)

		ctx := context.Background()
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "mock-test-namespace-2")
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()

		app.ModelsAAHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		var response ModelsAAEnvelope
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)

		// Should have namespace and custom_endpoint models, but not MaaS
		assert.GreaterOrEqual(t, len(response.Data), 8, "Should return namespace and custom_endpoint models")

		// Verify custom_endpoint models are present
		hasCustomEndpoint := false
		for _, model := range response.Data {
			if model.ModelSourceType == models.ModelSourceTypeCustomEndpoint {
				hasCustomEndpoint = true
			}
			// Verify no MaaS models (they all have model_source_type: "maas")
			assert.NotEqual(t, models.ModelSourceTypeMaaS, model.ModelSourceType, "Should not include MaaS models by default")
		}
		assert.True(t, hasCustomEndpoint, "Should include at least one custom_endpoint model by default")
	})

	It("should return only namespace models when sources=namespace", func() {
		t := GinkgoT()
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/models/aa?sources=namespace", nil)
		assert.NoError(t, err)

		ctx := context.Background()
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "mock-test-namespace-2")
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()

		app.ModelsAAHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		var response ModelsAAEnvelope
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)

		// All models should be namespace models
		for _, model := range response.Data {
			assert.Equal(t, models.ModelSourceTypeNamespace, model.ModelSourceType)
		}
	})

	It("should return only custom_endpoint models when sources=custom_endpoint", func() {
		t := GinkgoT()
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/models/aa?sources=custom_endpoint", nil)
		assert.NoError(t, err)

		ctx := context.Background()
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "mock-test-namespace-2")
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()

		app.ModelsAAHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		var response ModelsAAEnvelope
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)

		// Ensure at least one custom_endpoint model is returned
		assert.NotEmpty(t, response.Data, "Expected at least one custom_endpoint model")

		// All models should be custom_endpoint models
		for _, model := range response.Data {
			assert.Equal(t, models.ModelSourceTypeCustomEndpoint, model.ModelSourceType)
		}
	})

	It("should return only MaaS models when sources=maas", func() {
		t := GinkgoT()
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/models/aa?sources=maas", nil)
		assert.NoError(t, err)

		// Create mock MaaS client
		mockMaaSClient := mockClientFactory.CreateClient(bffclient.BFFTargetMaaS, "test-token")

		ctx := context.Background()
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "mock-test-namespace-2")
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		ctx = context.WithValue(ctx, constants.BFFClientKey(constants.BFFTarget(bffclient.BFFTargetMaaS)), mockMaaSClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()

		app.ModelsAAHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		var response ModelsAAEnvelope
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)

		assert.GreaterOrEqual(t, len(response.Data), 5, "Should return MaaS models")

		// All models should be MaaS models
		for _, model := range response.Data {
			assert.Equal(t, models.ModelSourceTypeMaaS, model.ModelSourceType)
		}
	})

	It("should return namespace and MaaS models when sources=namespace,maas", func() {
		t := GinkgoT()
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/models/aa?sources=namespace,maas", nil)
		assert.NoError(t, err)

		// Create mock MaaS client
		mockMaaSClient := mockClientFactory.CreateClient(bffclient.BFFTargetMaaS, "test-token")

		ctx := context.Background()
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "mock-test-namespace-2")
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		ctx = context.WithValue(ctx, constants.BFFClientKey(constants.BFFTarget(bffclient.BFFTargetMaaS)), mockMaaSClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()

		app.ModelsAAHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		var response ModelsAAEnvelope
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)

		// Should have both namespace and MaaS models
		hasNamespace := false
		hasMaaS := false

		for _, model := range response.Data {
			if model.ModelSourceType == models.ModelSourceTypeNamespace {
				hasNamespace = true
			}
			if model.ModelSourceType == models.ModelSourceTypeMaaS {
				hasMaaS = true
			}
		}

		assert.True(t, hasNamespace, "Should include namespace models")
		assert.True(t, hasMaaS, "Should include MaaS models")
	})

	It("should return all model sources when sources=namespace,custom_endpoint,maas", func() {
		t := GinkgoT()
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/models/aa?sources=namespace,custom_endpoint,maas", nil)
		assert.NoError(t, err)

		// Create mock MaaS client
		mockMaaSClient := mockClientFactory.CreateClient(bffclient.BFFTargetMaaS, "test-token")

		ctx := context.Background()
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "mock-test-namespace-2")
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		ctx = context.WithValue(ctx, constants.BFFClientKey(constants.BFFTarget(bffclient.BFFTargetMaaS)), mockMaaSClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()

		app.ModelsAAHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		var response ModelsAAEnvelope
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)

		// Should have all three types of models
		hasNamespace := false
		hasCustomEndpoint := false
		hasMaaS := false

		for _, model := range response.Data {
			switch model.ModelSourceType {
			case models.ModelSourceTypeNamespace:
				hasNamespace = true
			case models.ModelSourceTypeCustomEndpoint:
				hasCustomEndpoint = true
			case models.ModelSourceTypeMaaS:
				hasMaaS = true
			}
		}

		assert.True(t, hasNamespace, "Should include namespace models")
		assert.True(t, hasCustomEndpoint, "Should include custom_endpoint models")
		assert.True(t, hasMaaS, "Should include MaaS models")
	})

	It("should not fail request when MaaS fetch fails (logs error but continues)", func() {
		t := GinkgoT()
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/models/aa?sources=namespace,maas", nil)
		assert.NoError(t, err)

		// Create mock MaaS client that returns error
		mockMaaSClient := bffmocks.NewMockBFFClient(bffclient.BFFTargetMaaS)
		mockMaaSClient.CallHandler = func(ctx context.Context, method, path string, body interface{}, response interface{}) error {
			return bffclient.NewBFFClientError(bffclient.ErrCodeInternalError, "MaaS service unavailable", 503)
		}

		ctx := context.Background()
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "mock-test-namespace-2")
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		ctx = context.WithValue(ctx, constants.BFFClientKey(constants.BFFTarget(bffclient.BFFTargetMaaS)), mockMaaSClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()

		app.ModelsAAHandler(rr, req, nil)

		// Request should still succeed with 200
		assert.Equal(t, http.StatusOK, rr.Code)

		var response ModelsAAEnvelope
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)

		// Should have namespace models, but no MaaS models
		hasNamespace := false
		hasMaaS := false

		for _, model := range response.Data {
			if model.ModelSourceType == models.ModelSourceTypeNamespace {
				hasNamespace = true
			}
			if model.ModelSourceType == models.ModelSourceTypeMaaS {
				hasMaaS = true
			}
		}

		assert.True(t, hasNamespace, "Should include namespace models")
		assert.False(t, hasMaaS, "Should not include MaaS models when fetch fails")
	})

	It("should return 5xx when MaaS-only request fails", func() {
		t := GinkgoT()
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/models/aa?sources=maas", nil)
		assert.NoError(t, err)

		// Create mock MaaS client that returns error
		mockMaaSClient := bffmocks.NewMockBFFClient(bffclient.BFFTargetMaaS)
		mockMaaSClient.CallHandler = func(ctx context.Context, method, path string, body interface{}, response interface{}) error {
			return bffclient.NewBFFClientError(bffclient.ErrCodeInternalError, "MaaS service unavailable", 503)
		}

		ctx := context.Background()
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "mock-test-namespace-3")
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		ctx = context.WithValue(ctx, constants.BFFClientKey(constants.BFFTarget(bffclient.BFFTargetMaaS)), mockMaaSClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()

		app.ModelsAAHandler(rr, req, nil)

		// MaaS-only request should fail with 5xx status
		assert.Equal(t, http.StatusServiceUnavailable, rr.Code, "Should return 503 when MaaS is unavailable and it's the only source")
	})

	It("should return partial response headers when MaaS fails in mixed-source request", func() {
		t := GinkgoT()
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/models/aa?sources=namespace,maas", nil)
		assert.NoError(t, err)

		// Create mock MaaS client that returns error
		mockMaaSClient := bffmocks.NewMockBFFClient(bffclient.BFFTargetMaaS)
		mockMaaSClient.CallHandler = func(ctx context.Context, method, path string, body interface{}, response interface{}) error {
			return bffclient.NewBFFClientError(bffclient.ErrCodeInternalError, "MaaS service unavailable", 503)
		}

		ctx := context.Background()
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "mock-test-namespace-2")
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		ctx = context.WithValue(ctx, constants.BFFClientKey(constants.BFFTarget(bffclient.BFFTargetMaaS)), mockMaaSClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()

		app.ModelsAAHandler(rr, req, nil)

		// Mixed-source request should succeed with partial response headers
		assert.Equal(t, http.StatusOK, rr.Code, "Should return 200 with partial response when MaaS fails but namespace succeeds")
		assert.Equal(t, "true", rr.Header().Get("X-Partial-Response"), "Should set X-Partial-Response header")
		assert.Equal(t, "MaaS source unavailable", rr.Header().Get("X-Partial-Reason"), "Should set X-Partial-Reason header")

		var response ModelsAAEnvelope
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)

		// Should still have namespace models (no MaaS models)
		assert.NotEmpty(t, response.Data, "Should return namespace models despite MaaS failure")
		for _, model := range response.Data {
			assert.NotEqual(t, models.ModelSourceTypeMaaS, model.ModelSourceType, "Should not have MaaS models when MaaS source failed")
		}
	})

	It("should reject empty tokens in sources parameter", func() {
		t := GinkgoT()
		// Empty tokens (from trailing commas, etc.) are now rejected
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/models/aa?sources=namespace,,maas", nil)
		assert.NoError(t, err)

		ctx := context.Background()
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "mock-test-namespace")
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.ModelsAAHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code, "Should reject sources with empty tokens")
		assert.Contains(t, rr.Body.String(), "empty source value provided")
	})

	It("should reject duplicate tokens in sources parameter", func() {
		t := GinkgoT()
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/models/aa?sources=namespace,namespace", nil)
		assert.NoError(t, err)

		ctx := context.Background()
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "mock-test-namespace")
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.ModelsAAHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code, "Should return 400 for duplicate tokens in sources")
	})

	It("should reject more than 3 tokens in sources parameter", func() {
		t := GinkgoT()
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/models/aa?sources=namespace,custom_endpoint,maas,extra", nil)
		assert.NoError(t, err)

		ctx := context.Background()
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "mock-test-namespace")
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.ModelsAAHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code, "Should return 400 for more than 3 tokens in sources")
	})

	It("should return 400 when sources parameter contains invalid source value", func() {
		t := GinkgoT()
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/models/aa?sources=invalid_source", nil)
		assert.NoError(t, err)

		ctx := context.Background()
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "mock-test-namespace")
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.ModelsAAHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code, "Should return 400 for invalid source value")

		var response map[string]interface{}
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)

		errorData, exists := response["error"]
		assert.True(t, exists, "Response should contain 'error' field")

		errorMap, ok := errorData.(map[string]interface{})
		assert.True(t, ok, "Error should be a map")

		assert.Equal(t, "400", errorMap["code"])
		assert.Contains(t, errorMap["message"], "invalid_source", "Error message should mention the invalid source value")
	})

	It("should accept multiple sources query parameters (repeated format)", func() {
		t := GinkgoT()

		// Set up mock MaaS BFF client that returns a test model
		mockMaaSClient := bffmocks.NewMockBFFClient(bffclient.BFFTargetMaaS)
		mockMaaSClient.CallHandler = func(ctx context.Context, method, path string, body, response any) error {
			// Return a mock MaaS models response
			if resp, ok := response.(*models.MaaSBFFModelsResponse); ok {
				resp.Data = models.MaaSBFFModelsData{
					Data: []models.MaaSBFFModel{
						{
							ID:    "test-maas-model",
							URL:   "http://maas.example.com/test",
							Ready: true,
							ModelDetails: &models.MaaSBFFModelDetails{
								DisplayName:  "Test MaaS Model",
								Description:  "A test model from MaaS",
								GenAIUseCase: "test",
							},
							OwnedBy:   "maas-provider",
							ModelType: "llm",
						},
					},
				}
			}
			return nil
		}

		// Test that ?sources=namespace&sources=maas works (standard HTTP array format)
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/models/aa?sources=namespace&sources=maas", nil)
		assert.NoError(t, err)

		ctx := context.Background()
		// Use mock-test-namespace-2 which has namespace models
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "mock-test-namespace-2")
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		// Attach MaaS client to context using the same pattern as middleware
		ctx = context.WithValue(ctx, constants.BFFClientKey(constants.BFFTarget(bffclient.BFFTargetMaaS)), mockMaaSClient)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		app.ModelsAAHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code, "Should accept repeated sources parameters")

		var response ModelsAAEnvelope
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)

		// Verify both MaaS and namespace models are present
		// (test uses ?sources=namespace&sources=maas)
		hasMaaSModel := false
		hasNamespaceModel := false
		for _, model := range response.Data {
			if model.ModelSourceType == models.ModelSourceTypeMaaS && model.ModelID == "test-maas-model" {
				hasMaaSModel = true
			}
			if model.ModelSourceType == models.ModelSourceTypeNamespace {
				hasNamespaceModel = true
			}
		}
		assert.True(t, hasMaaSModel, "Should include the MaaS model from repeated sources parameters")
		assert.True(t, hasNamespaceModel, "Should include namespace models from repeated sources parameters")
	})
})
