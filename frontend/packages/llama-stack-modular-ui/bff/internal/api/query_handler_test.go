package api

import (
	"net/http"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/integrations/llamastack"
)

var _ = Describe("Query Handler", func() {

	Describe("Query API", func() {
		Context("when making a query with RAG tool", func() {
			It("should return successful response with RAG content", func() {
				queryRequest := QueryRequest{
					Content:     "What is machine learning?",
					VectorDBIDs: []string{"default-vector-db-id-1"},
					LLMModelID:  "llama-3.1-8b",
					QueryConfig: llamastack.QueryConfigParam{
						MaxChunks:          3,
						MaxTokensInContext: 800,
						ChunkTemplate:      "Custom template {index}: {chunk.content}",
					},
					SamplingParams: &llamastack.SamplingParams{
						Strategy:  llamastack.SamplingStrategy{Type: "greedy"},
						MaxTokens: 300,
					},
				}

				req := JSONRequest("POST", testCtx.App.getQueryPath(), queryRequest)
				resp := MakeRequest(req)
				Expect(resp.StatusCode).To(Equal(http.StatusOK))

				var response map[string]interface{}
				ReadJSONResponse(resp, &response)

				// Verify response structure
				Expect(response).To(HaveKey("rag_response"))
				Expect(response).To(HaveKey("chat_completion"))
				Expect(response).To(HaveKey("has_rag_content"))
				Expect(response).To(HaveKey("used_vector_dbs"))
				Expect(response).To(HaveKey("assistant_message"))

				// Verify RAG was used
				Expect(response["used_vector_dbs"]).To(BeTrue())
				Expect(response["has_rag_content"]).To(BeTrue())

				// Verify assistant message is present
				Expect(response["assistant_message"]).NotTo(BeEmpty())
			})
		})

		Context("when making a query without RAG tool", func() {
			It("should return successful response without RAG content", func() {
				queryRequest := QueryRequest{
					Content:    "What is machine learning?",
					LLMModelID: "llama-3.1-8b",
				}

				req := JSONRequest("POST", testCtx.App.getQueryPath(), queryRequest)
				resp := MakeRequest(req)
				Expect(resp.StatusCode).To(Equal(http.StatusOK))

				var response map[string]interface{}
				ReadJSONResponse(resp, &response)

				// Verify response structure
				Expect(response).To(HaveKey("rag_response"))
				Expect(response).To(HaveKey("chat_completion"))
				Expect(response).To(HaveKey("has_rag_content"))
				Expect(response).To(HaveKey("used_vector_dbs"))
				Expect(response).To(HaveKey("assistant_message"))

				// Verify RAG was not used
				Expect(response["used_vector_dbs"]).To(BeFalse())
				Expect(response["has_rag_content"]).To(BeFalse())

				// Verify assistant message is present
				Expect(response["assistant_message"]).NotTo(BeEmpty())
			})
		})

		Context("when content is missing", func() {
			It("should return 400 bad request", func() {
				queryRequest := QueryRequest{
					LLMModelID: "llama-3.1-8b",
				}

				req := JSONRequest("POST", testCtx.App.getQueryPath(), queryRequest)
				resp := MakeRequest(req)
				Expect(resp.StatusCode).To(Equal(http.StatusBadRequest))

				var errorResponse ErrorEnvelope
				ReadJSONResponse(resp, &errorResponse)

				Expect(errorResponse.Error.Code).To(Equal("400"))
				Expect(errorResponse.Error.Message).To(ContainSubstring("content is required"))
			})
		})

		Context("when LLM model ID is missing", func() {
			It("should return 400 bad request", func() {
				queryRequest := QueryRequest{
					Content: "What is machine learning?",
				}

				req := JSONRequest("POST", testCtx.App.getQueryPath(), queryRequest)
				resp := MakeRequest(req)
				Expect(resp.StatusCode).To(Equal(http.StatusBadRequest))

				var errorResponse ErrorEnvelope
				ReadJSONResponse(resp, &errorResponse)

				Expect(errorResponse.Error.Code).To(Equal("400"))
				Expect(errorResponse.Error.Message).To(ContainSubstring("llm_model_id is required"))
			})
		})

		Context("when checking response structure", func() {
			It("should have correct structure and types", func() {
				queryRequest := QueryRequest{
					Content:    "What is machine learning?",
					LLMModelID: "llama-3.1-8b",
				}

				req := JSONRequest("POST", testCtx.App.getQueryPath(), queryRequest)
				resp := MakeRequest(req)
				Expect(resp.StatusCode).To(Equal(http.StatusOK))

				var response map[string]interface{}
				ReadJSONResponse(resp, &response)

				// Verify all required fields are present
				requiredFields := []string{
					"rag_response",
					"chat_completion",
					"has_rag_content",
					"used_vector_dbs",
					"assistant_message",
				}

				for _, field := range requiredFields {
					Expect(response).To(HaveKey(field))
				}

				// Verify types
				Expect(response["rag_response"]).To(BeAssignableToTypeOf(map[string]interface{}{}))
				Expect(response["chat_completion"]).To(BeAssignableToTypeOf(map[string]interface{}{}))
				Expect(response["has_rag_content"]).To(BeAssignableToTypeOf(false))
				Expect(response["used_vector_dbs"]).To(BeAssignableToTypeOf(false))
				Expect(response["assistant_message"]).To(BeAssignableToTypeOf(""))

				// Verify chat completion structure
				chatCompletion := response["chat_completion"].(map[string]interface{})
				Expect(chatCompletion).To(HaveKey("completion_message"))

				completionMessage := chatCompletion["completion_message"].(map[string]interface{})
				Expect(completionMessage).To(HaveKey("content"))
				Expect(completionMessage).To(HaveKey("role"))

				// Verify assistant message matches chat completion content
				Expect(completionMessage["content"]).To(Equal(response["assistant_message"]))
			})
		})
	})
})
