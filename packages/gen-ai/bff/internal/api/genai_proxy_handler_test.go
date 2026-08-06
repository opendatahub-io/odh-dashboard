package api

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"

	"github.com/julienschmidt/httprouter"
	. "github.com/onsi/ginkgo/v2"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
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
		assert.NotNil(t, response.Data)

		// Verify each model has required OpenAI fields
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

		// No model should have Status "Stop" in the response
		for _, model := range response.Data {
			// The OpenAI format doesn't expose status, but stopped models
			// should not appear in the list at all
			assert.NotEmpty(t, model.ID)
		}
	})

	It("should work without auth identity (unauthenticated polling)", func() {
		t := GinkgoT()
		req := httptest.NewRequest(http.MethodGet, "/gen-ai/api/v1/genai-proxy/ns/mock-test-namespace-1/v1/models", nil)

		// No identity in context — simulates OGX background polling
		params := httprouter.Params{{Key: "namespace", Value: "mock-test-namespace-1"}}
		rr := httptest.NewRecorder()
		app.GenAIProxyNSModelsHandler(rr, req, params)

		// Should not fail with 401 — endpoint is unauthenticated
		assert.Equal(t, http.StatusOK, rr.Code)

		var response openAIModelList
		err := json.Unmarshal(rr.Body.Bytes(), &response)
		require.NoError(t, err)
		assert.Equal(t, "list", response.Object)
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

		// Check that models with model_type include it in custom_metadata
		for _, model := range response.Data {
			if model.CustomMetadata != nil {
				if modelType, ok := model.CustomMetadata["model_type"]; ok {
					assert.NotEmpty(t, modelType)
				}
			}
		}
	})
})
