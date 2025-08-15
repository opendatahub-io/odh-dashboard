package api

import (
	"net/http"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/constants"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/integrations/llamastack"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/models"
)

var _ = Describe("Models Handler", func() {
	ExpectedModels := []models.Model{
		{
			Identifier:         "llama-3.1-8b",
			ModelType:          "llm",
			ProviderID:         "meta",
			ProviderResourceID: "llama-3.1-8b-instruct",
		},
		{
			Identifier:         "text-embedding-ada-002",
			ModelType:          "embedding",
			ProviderID:         "openai",
			ProviderResourceID: "openai/text-embedding-ada-002",
		},
		{
			Identifier:         "claude-3-sonnet",
			ModelType:          "llm",
			ProviderID:         "anthropic",
			ProviderResourceID: "claude-3-sonnet-20240229",
		},
		{
			Identifier:         "sentence-transformers",
			ModelType:          "embedding",
			ProviderID:         "test-provider-4",
			ProviderResourceID: "all-MiniLM-L6-v2",
		},
	}

	ExpectedLLMModels := []models.Model{
		{
			Identifier:         "llama-3.1-8b",
			ModelType:          "llm",
			ProviderID:         "meta",
			ProviderResourceID: "llama-3.1-8b-instruct",
		},
		{
			Identifier:         "claude-3-sonnet",
			ModelType:          "llm",
			ProviderID:         "anthropic",
			ProviderResourceID: "claude-3-sonnet-20240229",
		},
	}

	ExpectedEmbeddingModels := []models.Model{
		{
			Identifier:         "text-embedding-ada-002",
			ModelType:          "embedding",
			ProviderID:         "openai",
			ProviderResourceID: "openai/text-embedding-ada-002",
		},
		{
			Identifier:         "sentence-transformers",
			ModelType:          "embedding",
			ProviderID:         "test-provider-4",
			ProviderResourceID: "all-MiniLM-L6-v2",
		},
	}

	Describe("Models API", func() {
		It("should return all models successfully", func() {
			path := testCtx.App.getModelListPath()
			req := JSONRequest("GET", path, nil)
			resp := MakeRequest(req)

			Expect(resp.StatusCode).To(Equal(http.StatusOK))

			var result ModelListEnvelope
			ReadJSONResponse(resp, &result)

			// Verify all models are returned (mock returns 4 models)
			Expect(result.Data.Items).To(HaveLen(4))
			Expect(result.Data.Items).To(Equal(ExpectedModels))
		})

		When("user queries by LLM model type", func() {
			It("should return only LLM models", func() {
				path := testCtx.App.getModelListPath()
				req := JSONRequest("GET", path, nil)
				req.QueryParams = map[string]string{
					"model_type": string(llamastack.LLMModelType),
				}

				resp := MakeRequest(req)

				Expect(resp.StatusCode).To(Equal(http.StatusOK))

				var result ModelListEnvelope
				ReadJSONResponse(resp, &result)

				// Should only return LLM models (2 from mock)
				Expect(result.Data.Items).To(HaveLen(2))
				Expect(result.Data.Items).To(Equal(ExpectedLLMModels))
			})
		})

		When("user queries by embedding model type", func() {
			It("should return only embedding models", func() {
				path := testCtx.App.getModelListPath()
				req := JSONRequest("GET", path, nil)
				req.QueryParams = map[string]string{
					"model_type": string(llamastack.EmbeddingModelType),
				}

				resp := MakeRequest(req)
				Expect(resp.StatusCode).To(Equal(http.StatusOK))

				var result ModelListEnvelope
				ReadJSONResponse(resp, &result)

				// Should only return embedding models (2 from mock)
				Expect(result.Data.Items).To(HaveLen(2))
				Expect(result.Data.Items).To(Equal(ExpectedEmbeddingModels))
			})
		})

		When("user queries by invalid filter", func() {
			It("should return all models (no filtering applied)", func() {
				path := testCtx.App.getModelListPath()
				req := JSONRequest("GET", path, nil)
				req.QueryParams = map[string]string{
					"model_type": "invalid_dummy_filter",
				}

				resp := MakeRequest(req)
				Expect(resp.StatusCode).To(Equal(http.StatusOK))

				var result ModelListEnvelope
				ReadJSONResponse(resp, &result)

				// Should return all models (no filtering applied for invalid filter)
				Expect(result.Data.Items).To(HaveLen(4))
			})
		})

		When("when checking response structure", func() {
			It("should have correct envelope structure", func() {
				path := testCtx.App.getModelListPath()
				req := JSONRequest("GET", path, nil)
				resp := MakeRequest(req)
				Expect(resp.StatusCode).To(Equal(http.StatusOK))

				// Parse as generic map to verify structure
				var response map[string]interface{}
				ReadJSONResponse(resp, &response)

				// Verify envelope structure
				Expect(response).To(HaveKey("data"))
				Expect(response).NotTo(HaveKey("metadata"))

				dataField := response["data"].(map[string]interface{})
				Expect(dataField).To(HaveKey("items"))

				items := dataField["items"].([]interface{})
				Expect(items).To(HaveLen(4))

				// Verify first item structure
				firstItem := items[0].(map[string]interface{})
				Expect(firstItem).To(HaveKey("identifier"))
				Expect(firstItem).To(HaveKey("model_type"))
				Expect(firstItem).To(HaveKey("provider_id"))
				Expect(firstItem).To(HaveKey("provider_resource_id"))
			})
		})
	})

	Describe("Model Constants", func() {
		It("should have correct constant values", func() {
			Expect(constants.LLMModelType).To(Equal("llm"))
			Expect(constants.EmbeddingModelType).To(Equal("embedding"))
		})
	})
})
