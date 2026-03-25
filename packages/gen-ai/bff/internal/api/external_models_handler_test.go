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
			ModelID:          "gpt-4o",
			ModelDisplayName: "GPT-4 Optimized",
			BaseURL:          "https://api.openai.com/v1",
			SecretValue:      "sk-test-api-key-12345",
			UseCases:         "Classification, Text Generation",
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

		assert.Equal(t, "gpt-4o", dataMap["model_id"])
		assert.Equal(t, "gpt-4o", dataMap["model_name"])
		assert.Equal(t, "GPT-4 Optimized", dataMap["display_name"])
		assert.Equal(t, "remote::openai", dataMap["serving_runtime"])
		assert.Equal(t, "REST", dataMap["api_protocol"])
		assert.Equal(t, "Unknown", dataMap["status"])
		assert.Equal(t, "Classification, Text Generation", dataMap["usecase"])

		endpoints, ok := dataMap["endpoints"].([]interface{})
		assert.True(t, ok, "Endpoints should be an array")
		assert.Len(t, endpoints, 1)
		assert.Equal(t, "https://api.openai.com/v1", endpoints[0])
	})

	It("should hardcode provider type to remote::openai", func() {
		t := GinkgoT()

		requestBody := models.ExternalModelRequest{
			ModelID:          "test-model",
			ModelDisplayName: "Test Model",
			BaseURL:          "https://api.example.com",
			SecretValue:      "test-key",
			// Note: not sending provider_type to verify it gets hardcoded
			ModelType: models.ModelTypeLLM,
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

		assert.Equal(t, http.StatusCreated, rr.Code)

		// Verify response has provider set to remote::openai
		var response map[string]interface{}
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)

		data, exists := response["data"]
		assert.True(t, exists)
		dataMap := data.(map[string]interface{})
		assert.Equal(t, "remote::openai", dataMap["serving_runtime"])
	})

	It("should successfully create an external model without optional use_cases field", func() {
		t := GinkgoT()

		embeddingDimension := 1536
		requestBody := models.ExternalModelRequest{
			ModelID:            "text-embedding-3-small",
			ModelDisplayName:   "OpenAI Text Embedding 3 Small",
			BaseURL:            "https://api.openai.com/v1",
			SecretValue:        "sk-test-key-abc123",
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

	// Test removed: provider_type is now hardcoded to remote::openai on the server side

	It("should return error when namespace is missing from context", func() {
		t := GinkgoT()

		requestBody := models.ExternalModelRequest{
			ModelID:          "test-model",
			ModelDisplayName: "Test Model",
			BaseURL:          "https://api.example.com",
			SecretValue:      "test-key",
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

var _ = Describe("VerifyExternalModelHandler", func() {
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

	It("should return 400 when namespace query parameter is missing", func() {
		t := GinkgoT()

		requestBody := models.VerifyExternalModelRequest{
			ModelID:     "gpt-4o",
			BaseURL:     "https://api.openai.com/v1",
			SecretValue: "sk-test-key",
			ModelType:   models.ModelTypeLLM,
		}

		bodyBytes, err := json.Marshal(requestBody)
		require.NoError(t, err)

		// Request without namespace query parameter
		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/models/external/verify", bytes.NewReader(bodyBytes))
		assert.NoError(t, err)

		// Add RequestIdentity to context for auth
		ctx := context.WithValue(context.Background(), constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()

		// Use Routes() to get the router with middleware
		router := app.Routes()
		router.ServeHTTP(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)

		var response map[string]interface{}
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)

		errorData, exists := response["error"]
		assert.True(t, exists, "Response should contain 'error' field")

		errorMap, ok := errorData.(map[string]interface{})
		assert.True(t, ok, "Error should be a map")

		assert.Equal(t, "400", errorMap["code"])
		assert.Contains(t, errorMap["message"], "missing required query parameter")
	})

	It("should return 401 when authentication headers are missing", func() {
		t := GinkgoT()

		requestBody := models.VerifyExternalModelRequest{
			ModelID:     "gpt-4o",
			BaseURL:     "https://api.openai.com/v1",
			SecretValue: "sk-test-key",
			ModelType:   models.ModelTypeLLM,
		}

		bodyBytes, err := json.Marshal(requestBody)
		require.NoError(t, err)

		// Request with namespace query parameter but no authentication headers
		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/models/external/verify?namespace=mock-test-namespace-1", bytes.NewReader(bodyBytes))
		assert.NoError(t, err)

		// No authentication headers - InjectRequestIdentity middleware should catch this
		rr := httptest.NewRecorder()

		// Use Routes() to get the router with middleware
		router := app.Routes()
		router.ServeHTTP(rr, req)

		// InjectRequestIdentity middleware calls unauthorizedResponse when headers are missing
		assert.Equal(t, http.StatusUnauthorized, rr.Code)

		var response map[string]interface{}
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)

		errorData, exists := response["error"]
		assert.True(t, exists, "Response should contain 'error' field")

		errorMap, ok := errorData.(map[string]interface{})
		assert.True(t, ok, "Error should be a map")

		assert.Equal(t, "UNAUTHORIZED", errorMap["code"])
	})

	It("should validate request fields and return 400 for invalid input", func() {
		t := GinkgoT()

		zeroDimension := 0
		negativeDimension := -5

		testCases := []struct {
			name          string
			request       models.VerifyExternalModelRequest
			expectedError string
		}{
			{
				name: "missing model_id",
				request: models.VerifyExternalModelRequest{
					BaseURL:     "https://api.openai.com/v1",
					SecretValue: "sk-test-key",
					ModelType:   models.ModelTypeLLM,
				},
				expectedError: "model_id is required",
			},
			{
				name: "missing base_url",
				request: models.VerifyExternalModelRequest{
					ModelID:     "gpt-4o",
					SecretValue: "sk-test-key",
					ModelType:   models.ModelTypeLLM,
				},
				expectedError: "base_url is required",
			},
			{
				name: "missing model_type",
				request: models.VerifyExternalModelRequest{
					ModelID:     "gpt-4o",
					BaseURL:     "https://api.openai.com/v1",
					SecretValue: "sk-test-key",
				},
				expectedError: "model_type is required",
			},
			{
				name: "invalid model_type",
				request: models.VerifyExternalModelRequest{
					ModelID:     "gpt-4o",
					BaseURL:     "https://api.openai.com/v1",
					SecretValue: "sk-test-key",
					ModelType:   "invalid_type",
				},
				expectedError: "invalid model_type",
			},
			{
				name: "missing embedding_dimension for embedding model",
				request: models.VerifyExternalModelRequest{
					ModelID:     "text-embedding-3-small",
					BaseURL:     "https://api.openai.com/v1",
					SecretValue: "sk-test-key",
					ModelType:   models.ModelTypeEmbedding,
				},
				expectedError: "embedding_dimension is required for embedding models",
			},
			{
				name: "zero embedding_dimension",
				request: models.VerifyExternalModelRequest{
					ModelID:            "text-embedding-3-small",
					BaseURL:            "https://api.openai.com/v1",
					SecretValue:        "sk-test-key",
					ModelType:          models.ModelTypeEmbedding,
					EmbeddingDimension: &zeroDimension,
				},
				expectedError: "embedding_dimension must be a positive number",
			},
			{
				name: "negative embedding_dimension",
				request: models.VerifyExternalModelRequest{
					ModelID:            "text-embedding-3-small",
					BaseURL:            "https://api.openai.com/v1",
					SecretValue:        "sk-test-key",
					ModelType:          models.ModelTypeEmbedding,
					EmbeddingDimension: &negativeDimension,
				},
				expectedError: "embedding_dimension must be a positive number",
			},
		}

		for _, tc := range testCases {
			// Create context for subtests
			bodyBytes, err := json.Marshal(tc.request)
			require.NoError(t, err, "Failed for case: %s", tc.name)

			req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/models/external/verify", bytes.NewReader(bodyBytes))
			assert.NoError(t, err)

			ctx := context.Background()
			ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "mock-test-namespace-1")
			ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
				Token: "FAKE_BEARER_TOKEN",
			})
			req = req.WithContext(ctx)

			rr := httptest.NewRecorder()
			app.VerifyExternalModelHandler(rr, req, nil)

			assert.Equal(t, http.StatusBadRequest, rr.Code, "Failed for case: %s", tc.name)

			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			assert.NoError(t, err)

			errorData, exists := response["error"]
			assert.True(t, exists, "Response should contain 'error' field for case: %s", tc.name)

			errorMap, ok := errorData.(map[string]interface{})
			assert.True(t, ok, "Error should be a map for case: %s", tc.name)

			assert.Equal(t, "400", errorMap["code"], "Failed for case: %s", tc.name)
			assert.Contains(t, errorMap["message"], tc.expectedError, "Failed for case: %s", tc.name)
		}
	})
	It("should return 400 when request body is invalid JSON", func() {
		t := GinkgoT()

		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/models/external/verify", bytes.NewReader([]byte("invalid json")))
		assert.NoError(t, err)

		ctx := context.Background()
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "mock-test-namespace-1")
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()

		app.VerifyExternalModelHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	It("should successfully verify an LLM model with OpenAI-compatible API", func() {
		t := GinkgoT()

		// Create a mock OpenAI-compatible server
		mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Authorization header is omitted over plain HTTP (mock server uses http://)
			assert.Equal(t, "application/json", r.Header.Get("Content-Type"))

			// Verify endpoint
			assert.Equal(t, "/chat/completions", r.URL.Path)

			// Return OpenAI-compatible response
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			response := map[string]interface{}{
				"id":      "chatcmpl-123",
				"object":  "chat.completion",
				"created": 1677652288,
				"model":   "gpt-4o",
				"choices": []map[string]interface{}{
					{
						"index": 0,
						"message": map[string]interface{}{
							"role":    "assistant",
							"content": "test response",
						},
						"finish_reason": "stop",
					},
				},
				"usage": map[string]interface{}{
					"prompt_tokens":     5,
					"completion_tokens": 7,
					"total_tokens":      12,
				},
			}
			err := json.NewEncoder(w).Encode(response)
			require.NoError(t, err)
		}))
		defer mockServer.Close()

		requestBody := models.VerifyExternalModelRequest{
			ModelID:     "gpt-4o",
			BaseURL:     mockServer.URL,
			SecretValue: "test-api-key",
			ModelType:   models.ModelTypeLLM,
		}

		bodyBytes, err := json.Marshal(requestBody)
		require.NoError(t, err)

		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/models/external/verify", bytes.NewReader(bodyBytes))
		assert.NoError(t, err)

		ctx := context.Background()
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "mock-test-namespace-1")
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()

		app.VerifyExternalModelHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		var response map[string]interface{}
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)

		dataField, exists := response["data"]
		assert.True(t, exists, "Response should contain 'data' field")

		data, ok := dataField.(map[string]interface{})
		assert.True(t, ok, "Data should be a map")

		assert.Equal(t, true, data["success"])
		assert.Equal(t, "External model verified successfully", data["message"])
		// response_time_ms is optional but should be present and >= 0 if included
		if responseTime, exists := data["response_time_ms"]; exists {
			assert.GreaterOrEqual(t, responseTime, float64(0))
		}
	})

	It("should successfully verify an embedding model with dimension parameter", func() {
		t := GinkgoT()

		// Create a mock OpenAI-compatible embeddings server
		mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Authorization header is omitted over plain HTTP (mock server uses http://)
			assert.Equal(t, "/embeddings", r.URL.Path)

			// Verify request body includes dimensions
			body, err := io.ReadAll(r.Body)
			assert.NoError(t, err)

			var reqData map[string]interface{}
			err = json.Unmarshal(body, &reqData)
			assert.NoError(t, err)

			assert.Equal(t, "text-embedding-3-small", reqData["model"])
			assert.Equal(t, "test", reqData["input"])
			assert.Equal(t, float64(1536), reqData["dimensions"])

			// Return OpenAI-compatible embeddings response
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			response := map[string]interface{}{
				"object": "list",
				"data": []map[string]interface{}{
					{
						"object":    "embedding",
						"embedding": []float64{0.1, 0.2, 0.3},
						"index":     0,
					},
				},
				"model": "text-embedding-3-small",
				"usage": map[string]interface{}{
					"prompt_tokens": 8,
					"total_tokens":  8,
				},
			}
			err = json.NewEncoder(w).Encode(response)
			require.NoError(t, err)
		}))
		defer mockServer.Close()

		embeddingDimension := 1536
		requestBody := models.VerifyExternalModelRequest{
			ModelID:            "text-embedding-3-small",
			BaseURL:            mockServer.URL,
			SecretValue:        "test-embedding-key",
			ModelType:          models.ModelTypeEmbedding,
			EmbeddingDimension: &embeddingDimension,
		}

		bodyBytes, err := json.Marshal(requestBody)
		require.NoError(t, err)

		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/models/external/verify", bytes.NewReader(bodyBytes))
		assert.NoError(t, err)

		ctx := context.Background()
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "mock-test-namespace-1")
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()

		app.VerifyExternalModelHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		var response map[string]interface{}
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)

		dataField, exists := response["data"]
		assert.True(t, exists)

		data, ok := dataField.(map[string]interface{})
		assert.True(t, ok)

		assert.Equal(t, true, data["success"])
		assert.Equal(t, "External model verified successfully", data["message"])
	})

	It("should return UNAUTHORIZED error when API key is invalid", func() {
		t := GinkgoT()

		// Create a mock server that returns 401
		mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusUnauthorized)
			_, err := w.Write([]byte(`{"error": {"message": "Invalid API key"}}`))
			require.NoError(t, err)
		}))
		defer mockServer.Close()

		requestBody := models.VerifyExternalModelRequest{
			ModelID:     "gpt-4o",
			BaseURL:     mockServer.URL,
			SecretValue: "invalid-key",
			ModelType:   models.ModelTypeLLM,
		}

		bodyBytes, err := json.Marshal(requestBody)
		require.NoError(t, err)

		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/models/external/verify", bytes.NewReader(bodyBytes))
		assert.NoError(t, err)

		ctx := context.Background()
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "mock-test-namespace-1")
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()

		app.VerifyExternalModelHandler(rr, req, nil)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)

		var response map[string]interface{}
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)

		errorData, exists := response["error"]
		assert.True(t, exists)

		errorMap, ok := errorData.(map[string]interface{})
		assert.True(t, ok)

		assert.Equal(t, "UNAUTHORIZED", errorMap["code"])
		assert.Contains(t, errorMap["message"], "API key is invalid or unauthorized")
	})

	It("should return CONNECTION_FAILED error when endpoint returns 404", func() {
		t := GinkgoT()

		// Create a mock server that returns 404
		mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusNotFound)
			_, err := w.Write([]byte(`{"error": "Not found"}`))
			require.NoError(t, err)
		}))
		defer mockServer.Close()

		requestBody := models.VerifyExternalModelRequest{
			ModelID:     "gpt-4o",
			BaseURL:     mockServer.URL,
			SecretValue: "test-key",
			ModelType:   models.ModelTypeLLM,
		}

		bodyBytes, err := json.Marshal(requestBody)
		require.NoError(t, err)

		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/models/external/verify", bytes.NewReader(bodyBytes))
		assert.NoError(t, err)

		ctx := context.Background()
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "mock-test-namespace-1")
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()

		app.VerifyExternalModelHandler(rr, req, nil)

		assert.Equal(t, http.StatusServiceUnavailable, rr.Code)

		var response map[string]interface{}
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)

		errorData, exists := response["error"]
		assert.True(t, exists)

		errorMap, ok := errorData.(map[string]interface{})
		assert.True(t, ok)

		assert.Equal(t, "CONNECTION_FAILED", errorMap["code"])
		assert.Contains(t, errorMap["message"], "404")
	})

	It("should return CONNECTION_FAILED error when server is unreachable", func() {
		t := GinkgoT()

		requestBody := models.VerifyExternalModelRequest{
			ModelID:     "gpt-4o",
			BaseURL:     "http://localhost:9999", // Invalid/unreachable endpoint
			SecretValue: "test-key",
			ModelType:   models.ModelTypeLLM,
		}

		bodyBytes, err := json.Marshal(requestBody)
		require.NoError(t, err)

		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/models/external/verify", bytes.NewReader(bodyBytes))
		assert.NoError(t, err)

		ctx := context.Background()
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "mock-test-namespace-1")
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
			Token: "FAKE_BEARER_TOKEN",
		})
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()

		app.VerifyExternalModelHandler(rr, req, nil)

		assert.Equal(t, http.StatusServiceUnavailable, rr.Code)

		var response map[string]interface{}
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)

		errorData, exists := response["error"]
		assert.True(t, exists)

		errorMap, ok := errorData.(map[string]interface{})
		assert.True(t, ok)

		assert.Equal(t, "CONNECTION_FAILED", errorMap["code"])
	})

	It("should return INVALID_CONFIGURATION for URL validation errors", func() {
		t := GinkgoT()

		testCases := []struct {
			name            string
			baseURL         string
			expectedMessage string
		}{
			{
				name:            "invalid URL scheme (ftp)",
				baseURL:         "ftp://invalid.example.com",
				expectedMessage: "HTTP or HTTPS scheme",
			},
			{
				name:            "URL without hostname",
				baseURL:         "https://",
				expectedMessage: "valid hostname",
			},
			{
				name:            "malformed URL",
				baseURL:         "://invalid",
				expectedMessage: "Invalid base URL",
			},
		}

		for _, tc := range testCases {
			requestBody := models.VerifyExternalModelRequest{
				ModelID:     "gpt-4o",
				BaseURL:     tc.baseURL,
				SecretValue: "test-key",
				ModelType:   models.ModelTypeLLM,
			}

			bodyBytes, err := json.Marshal(requestBody)
			require.NoError(t, err, "Failed for case: %s", tc.name)

			req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/models/external/verify", bytes.NewReader(bodyBytes))
			assert.NoError(t, err)

			ctx := context.Background()
			ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "mock-test-namespace-1")
			ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{
				Token: "FAKE_BEARER_TOKEN",
			})
			req = req.WithContext(ctx)
			rr := httptest.NewRecorder()

			app.VerifyExternalModelHandler(rr, req, nil)

			assert.Equal(t, http.StatusBadRequest, rr.Code, "Failed for case: %s", tc.name)

			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			assert.NoError(t, err)

			errorData, exists := response["error"]
			assert.True(t, exists, "Response should contain 'error' field for case: %s", tc.name)

			errorMap, ok := errorData.(map[string]interface{})
			assert.True(t, ok, "Error should be a map for case: %s", tc.name)

			assert.Equal(t, "INVALID_CONFIGURATION", errorMap["code"], "Failed for case: %s", tc.name)
			assert.Contains(t, errorMap["message"], tc.expectedMessage, "Failed for case: %s", tc.name)
		}
	})
})
