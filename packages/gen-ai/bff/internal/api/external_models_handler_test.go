package api

import (
	"bytes"
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
	"github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes/k8smocks"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack/lsmocks"
	"github.com/opendatahub-io/gen-ai/internal/models"
	"github.com/opendatahub-io/gen-ai/internal/repositories"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var _ = Describe("CreateExternalModelHandler", func() {
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

	It("should successfully create an external model with all required fields", func() {
		t := GinkgoT()

		requestBody := models.ExternalModelRequest{
			ModelID:          "gemini-2.5-flash-lite",
			ModelDisplayName: "Gemini 2.5 Flash Lite",
			BaseURL:          "https://generativelanguage.googleapis.com/v1beta/openai/",
			SecretValue:      "test-api-key-12345",
			ProviderType:     models.ProviderTypeGemini,
			UseCases:         "Classification, Image Generation",
			ModelType:        models.ModelTypeLLM,
		}

		bodyBytes, err := json.Marshal(requestBody)
		require.NoError(t, err)

		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/models/external", bytes.NewReader(bodyBytes))
		assert.NoError(t, err)

		ctx := context.Background()
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "mock-test-namespace-1")
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()

		app.CreateExternalModelHandler(rr, req, nil)

		rs := rr.Result()
		defer func() { _ = rs.Body.Close() }()

		body, err := io.ReadAll(rs.Body)
		assert.NoError(t, err)

		var response map[string]interface{}
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		assert.Equal(t, http.StatusCreated, rr.Code)

		data, exists := response["data"]
		assert.True(t, exists, "Response should contain 'data' field")

		dataMap, ok := data.(map[string]interface{})
		assert.True(t, ok, "Data should be a map")

		assert.Equal(t, "gemini-2.5-flash-lite", dataMap["model_id"])
		assert.Equal(t, "gemini-2.5-flash-lite", dataMap["model_name"])
		assert.Equal(t, "Gemini 2.5 Flash Lite", dataMap["display_name"])
		assert.Equal(t, "remote::gemini", dataMap["serving_runtime"])
		assert.Equal(t, "REST", dataMap["api_protocol"])
		assert.Equal(t, "Running", dataMap["status"])
		assert.Equal(t, "Classification, Image Generation", dataMap["usecase"])

		endpoints, ok := dataMap["endpoints"].([]interface{})
		assert.True(t, ok, "Endpoints should be an array")
		assert.Len(t, endpoints, 1)
		assert.Equal(t, "external: https://generativelanguage.googleapis.com/v1beta/openai/", endpoints[0])
	})

	It("should support all provider types", func() {
		t := GinkgoT()

		providers := []struct {
			providerType models.ProviderTypeEnum
			modelID      string
		}{
			{models.ProviderTypeGemini, "gemini-test"},
			{models.ProviderTypeOpenAI, "gpt-4"},
			{models.ProviderTypeAnthropic, "claude-3"},
			{models.ProviderTypeVLLM, "llama-2"},
		}

		for i, p := range providers {
			requestBody := models.ExternalModelRequest{
				ModelID:          p.modelID,
				ModelDisplayName: "Test Model",
				BaseURL:          "https://api.example.com",
				SecretValue:      "test-key",
				ProviderType:     p.providerType,
				ModelType:        models.ModelTypeLLM,
			}

			bodyBytes, err := json.Marshal(requestBody)
			require.NoError(t, err)

			req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/models/external", bytes.NewReader(bodyBytes))
			assert.NoError(t, err)

			// Use different namespaces for each iteration
			// Each namespace gets its own ConfigMap, so each will have provider ID 1 (which is correct)
			namespaces := []string{"mock-test-namespace-1", "mock-test-namespace-2", "mock-test-namespace-3", "mock-test-namespace-4"}
			namespace := namespaces[i]
			ctx := context.Background()
			ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, namespace)
			ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
				Token: "FAKE_BEARER_TOKEN",
			})
			req = req.WithContext(ctx)

			rr := httptest.NewRecorder()
			app.CreateExternalModelHandler(rr, req, nil)

			assert.Equal(t, http.StatusCreated, rr.Code, "Failed for provider: %s", p.providerType)
		}
	})

	It("should successfully create an external model without optional use_cases field", func() {
		t := GinkgoT()

		embeddingDimension := 1536
		requestBody := models.ExternalModelRequest{
			ModelID:            "text-embedding-3-small",
			ModelDisplayName:   "OpenAI Text Embedding 3 Small",
			BaseURL:            "https://api.openai.com/v1",
			SecretValue:        "sk-test-key-abc123",
			ProviderType:       models.ProviderTypeOpenAI,
			ModelType:          models.ModelTypeEmbedding,
			EmbeddingDimension: &embeddingDimension,
		}

		bodyBytes, err := json.Marshal(requestBody)
		require.NoError(t, err)

		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/models/external", bytes.NewReader(bodyBytes))
		assert.NoError(t, err)

		ctx := context.Background()
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "mock-test-namespace-2")
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()

		app.CreateExternalModelHandler(rr, req, nil)

		assert.Equal(t, http.StatusCreated, rr.Code)

		var response map[string]interface{}
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)

		dataField, exists := response["data"]
		require.True(t, exists, "Response should contain 'data' field")

		data, ok := dataField.(map[string]interface{})
		require.True(t, ok, "Data should be a map")

		assert.Equal(t, "text-embedding-3-small", data["model_id"])
		assert.Equal(t, "OpenAI Text Embedding 3 Small", data["display_name"])
		assert.Equal(t, "text-embedding-3-small", data["model_name"])
	})

	It("should return error when model_id is missing", func() {
		t := GinkgoT()

		requestBody := models.ExternalModelRequest{
			ModelDisplayName: "Test Model",
			BaseURL:          "https://api.example.com",
			SecretValue:      "test-key",
			ProviderType:     models.ProviderTypeOpenAI,
			ModelType:        models.ModelTypeLLM,
		}

		bodyBytes, err := json.Marshal(requestBody)
		require.NoError(t, err)

		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/models/external", bytes.NewReader(bodyBytes))
		assert.NoError(t, err)

		ctx := context.Background()
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "mock-test-namespace-1")
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()

		app.CreateExternalModelHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)

		var response map[string]interface{}
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)

		errorData, exists := response["error"]
		assert.True(t, exists, "Response should contain 'error' field")

		errorMap, ok := errorData.(map[string]interface{})
		assert.True(t, ok, "Error should be a map")

		assert.Equal(t, "400", errorMap["code"])
		assert.Contains(t, errorMap["message"], "model_id is required")
	})

	It("should return error when provider_type is invalid", func() {
		t := GinkgoT()

		requestBody := map[string]interface{}{
			"model_id":           "test-model",
			"model_display_name": "Test Model",
			"base_url":           "https://api.example.com",
			"secret_value":       "test-key",
			"provider_type":      "remote::invalid-provider",
			"model_type":         "llm",
		}

		bodyBytes, err := json.Marshal(requestBody)
		require.NoError(t, err)

		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/models/external", bytes.NewReader(bodyBytes))
		assert.NoError(t, err)

		ctx := context.Background()
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "mock-test-namespace-1")
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()

		app.CreateExternalModelHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)

		var response map[string]interface{}
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)

		errorData, exists := response["error"]
		assert.True(t, exists, "Response should contain 'error' field")

		errorMap, ok := errorData.(map[string]interface{})
		assert.True(t, ok, "Error should be a map")

		message, messageExists := errorMap["message"]
		assert.True(t, messageExists, "Error map should contain 'message' field")

		messageStr, isString := message.(string)
		assert.True(t, isString, "Message should be a string")

		assert.Contains(t, messageStr, "invalid provider_type")
	})

	It("should return error when namespace is missing from context", func() {
		t := GinkgoT()

		requestBody := models.ExternalModelRequest{
			ModelID:          "test-model",
			ModelDisplayName: "Test Model",
			BaseURL:          "https://api.example.com",
			SecretValue:      "test-key",
			ProviderType:     models.ProviderTypeOpenAI,
			ModelType:        models.ModelTypeLLM,
		}

		bodyBytes, err := json.Marshal(requestBody)
		require.NoError(t, err)

		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/models/external", bytes.NewReader(bodyBytes))
		assert.NoError(t, err)

		rr := httptest.NewRecorder()

		app.CreateExternalModelHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)

		var response map[string]interface{}
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)

		errorData, exists := response["error"]
		assert.True(t, exists, "Response should contain 'error' field")

		errorMap, ok := errorData.(map[string]interface{})
		assert.True(t, ok, "Error should be a map")

		code, codeExists := errorMap["code"]
		assert.True(t, codeExists, "Error map should contain 'code' field")
		assert.Equal(t, "400", code)

		message, messageExists := errorMap["message"]
		assert.True(t, messageExists, "Error map should contain 'message' field")

		messageStr, isString := message.(string)
		assert.True(t, isString, "Message should be a string")

		assert.Contains(t, messageStr, "missing namespace in the context")
	})

	It("should return error when RequestIdentity is missing from context", func() {
		t := GinkgoT()

		requestBody := models.ExternalModelRequest{
			ModelID:          "test-model",
			ModelDisplayName: "Test Model",
			BaseURL:          "https://api.example.com",
			SecretValue:      "test-key",
			ProviderType:     models.ProviderTypeOpenAI,
			ModelType:        models.ModelTypeLLM,
		}

		bodyBytes, err := json.Marshal(requestBody)
		require.NoError(t, err)

		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/models/external", bytes.NewReader(bodyBytes))
		assert.NoError(t, err)

		ctx := context.WithValue(context.Background(), constants.NamespaceQueryParameterKey, "mock-test-namespace-1")
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()

		app.CreateExternalModelHandler(rr, req, nil)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)

		var response map[string]interface{}
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)

		errorData, exists := response["error"]
		assert.True(t, exists, "Response should contain 'error' field")

		errorMap, ok := errorData.(map[string]interface{})
		assert.True(t, ok, "Error should be a map")

		code, codeExists := errorMap["code"]
		assert.True(t, codeExists, "Error map should contain 'code' field")
		assert.Equal(t, "401", code)

		message, messageExists := errorMap["message"]
		assert.True(t, messageExists, "Error map should contain 'message' field")

		messageStr, isString := message.(string)
		assert.True(t, isString, "Message should be a string")

		assert.Contains(t, messageStr, "missing RequestIdentity in context")
	})
})

var _ = Describe("DeleteExternalModelHandler", func() {
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

	It("should successfully delete an existing external model", func() {
		t := GinkgoT()

		// First create an external model
		createRequestBody := models.ExternalModelRequest{
			ModelID:          "test-delete-model",
			ModelDisplayName: "Test Delete Model",
			BaseURL:          "https://api.test-delete.com/v1",
			SecretValue:      "test-api-key",
			ProviderType:     models.ProviderTypeOpenAI,
			UseCases:         "Testing",
			ModelType:        models.ModelTypeLLM,
		}

		createReqBody, err := json.Marshal(createRequestBody)
		require.NoError(t, err)

		createReq, err := http.NewRequest("POST", "/gen-ai/api/v1/models/external?namespace=mock-test-namespace-1", bytes.NewReader(createReqBody))
		require.NoError(t, err)

		createReq = createReq.WithContext(context.WithValue(context.Background(), constants.NamespaceQueryParameterKey, "mock-test-namespace-1"))
		createReq = createReq.WithContext(context.WithValue(createReq.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		}))

		createRR := httptest.NewRecorder()
		app.CreateExternalModelHandler(createRR, createReq, nil)

		assert.Equal(t, http.StatusCreated, createRR.Code)

		// Now delete the model
		deleteReq, err := http.NewRequest("DELETE", "/gen-ai/api/v1/models/external?model_id=test-delete-model&namespace=mock-test-namespace-1", nil)
		require.NoError(t, err)

		deleteReq = deleteReq.WithContext(context.WithValue(context.Background(), constants.NamespaceQueryParameterKey, "mock-test-namespace-1"))
		deleteReq = deleteReq.WithContext(context.WithValue(deleteReq.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		}))

		deleteRR := httptest.NewRecorder()

		app.DeleteExternalModelHandler(deleteRR, deleteReq, nil)

		assert.Equal(t, http.StatusNoContent, deleteRR.Code)
	})

	It("should return 404 when trying to delete a non-existent model", func() {
		t := GinkgoT()

		deleteReq, err := http.NewRequest("DELETE", "/gen-ai/api/v1/models/external?model_id=non-existent-model&namespace=mock-test-namespace-1", nil)
		require.NoError(t, err)

		deleteReq = deleteReq.WithContext(context.WithValue(context.Background(), constants.NamespaceQueryParameterKey, "mock-test-namespace-1"))
		deleteReq = deleteReq.WithContext(context.WithValue(deleteReq.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		}))

		deleteRR := httptest.NewRecorder()

		app.DeleteExternalModelHandler(deleteRR, deleteReq, nil)

		// Should return 404 when model is not found
		assert.Equal(t, http.StatusNotFound, deleteRR.Code)

		var response map[string]interface{}
		err = json.Unmarshal(deleteRR.Body.Bytes(), &response)
		assert.NoError(t, err)

		errorData, exists := response["error"]
		assert.True(t, exists, "Response should contain 'error' field")

		errorMap, ok := errorData.(map[string]interface{})
		assert.True(t, ok, "Error should be a map")

		code, codeExists := errorMap["code"]
		assert.True(t, codeExists, "Error map should contain 'code' field")
		assert.Equal(t, "404", code)

		message, messageExists := errorMap["message"]
		assert.True(t, messageExists, "Error map should contain 'message' field")

		messageStr, isString := message.(string)
		assert.True(t, isString, "Message should be a string")

		assert.Contains(t, messageStr, "could not be found")
	})

	It("should return 400 when namespace is missing", func() {
		t := GinkgoT()

		deleteReq, err := http.NewRequest("DELETE", "/gen-ai/api/v1/models/external?model_id=test-model", nil)
		require.NoError(t, err)

		deleteReq = deleteReq.WithContext(context.WithValue(deleteReq.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		}))

		deleteRR := httptest.NewRecorder()

		app.DeleteExternalModelHandler(deleteRR, deleteReq, nil)

		assert.Equal(t, http.StatusBadRequest, deleteRR.Code)

		var response map[string]interface{}
		err = json.Unmarshal(deleteRR.Body.Bytes(), &response)
		assert.NoError(t, err)

		errorData, exists := response["error"]
		assert.True(t, exists, "Response should contain 'error' field")

		errorMap, ok := errorData.(map[string]interface{})
		assert.True(t, ok, "Error should be a map")

		code, codeExists := errorMap["code"]
		assert.True(t, codeExists, "Error map should contain 'code' field")
		assert.Equal(t, "400", code)
	})

	It("should return 401 when RequestIdentity is missing", func() {
		t := GinkgoT()

		deleteReq, err := http.NewRequest("DELETE", "/gen-ai/api/v1/models/external?model_id=test-model&namespace=mock-test-namespace-1", nil)
		require.NoError(t, err)

		deleteReq = deleteReq.WithContext(context.WithValue(context.Background(), constants.NamespaceQueryParameterKey, "mock-test-namespace-1"))

		deleteRR := httptest.NewRecorder()

		app.DeleteExternalModelHandler(deleteRR, deleteReq, nil)

		assert.Equal(t, http.StatusUnauthorized, deleteRR.Code)

		var response map[string]interface{}
		err = json.Unmarshal(deleteRR.Body.Bytes(), &response)
		assert.NoError(t, err)

		errorData, exists := response["error"]
		assert.True(t, exists, "Response should contain 'error' field")

		errorMap, ok := errorData.(map[string]interface{})
		assert.True(t, ok, "Error should be a map")

		code, codeExists := errorMap["code"]
		assert.True(t, codeExists, "Error map should contain 'code' field")
		assert.Equal(t, "401", code)

		message, messageExists := errorMap["message"]
		assert.True(t, messageExists, "Error map should contain 'message' field")

		messageStr, isString := message.(string)
		assert.True(t, isString, "Message should be a string")

		assert.Contains(t, messageStr, "missing RequestIdentity in context")
	})

	It("should successfully delete a model with slashes in model_id", func() {
		t := GinkgoT()

		// First create an external model with slashes in the ID
		createRequestBody := models.ExternalModelRequest{
			ModelID:          "openai/gpt-4o",
			ModelDisplayName: "OpenAI GPT-4o",
			BaseURL:          "https://api.openai.com/v1",
			SecretValue:      "test-api-key",
			ProviderType:     models.ProviderTypeOpenAI,
			UseCases:         "Testing slash support",
			ModelType:        models.ModelTypeLLM,
		}

		createReqBody, err := json.Marshal(createRequestBody)
		require.NoError(t, err)

		createReq, err := http.NewRequest("POST", "/gen-ai/api/v1/models/external?namespace=mock-test-namespace-1", bytes.NewReader(createReqBody))
		require.NoError(t, err)

		createReq = createReq.WithContext(context.WithValue(context.Background(), constants.NamespaceQueryParameterKey, "mock-test-namespace-1"))
		createReq = createReq.WithContext(context.WithValue(createReq.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		}))

		createRR := httptest.NewRecorder()
		app.CreateExternalModelHandler(createRR, createReq, nil)

		assert.Equal(t, http.StatusCreated, createRR.Code)

		// Now delete the model using query parameter (supports slashes)
		deleteReq, err := http.NewRequest("DELETE", "/gen-ai/api/v1/models/external?model_id=openai/gpt-4o&namespace=mock-test-namespace-1", nil)
		require.NoError(t, err)

		deleteReq = deleteReq.WithContext(context.WithValue(context.Background(), constants.NamespaceQueryParameterKey, "mock-test-namespace-1"))
		deleteReq = deleteReq.WithContext(context.WithValue(deleteReq.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		}))

		deleteRR := httptest.NewRecorder()

		app.DeleteExternalModelHandler(deleteRR, deleteReq, nil)

		assert.Equal(t, http.StatusNoContent, deleteRR.Code)
	})
})
