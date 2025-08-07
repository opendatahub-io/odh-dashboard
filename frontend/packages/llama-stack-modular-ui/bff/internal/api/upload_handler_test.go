package api

import (
	"net/http"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/integrations/llamastack"
)

var _ = Describe("Upload Handler", func() {
	testDocuments := []llamastack.Document{
		{
			DocumentID: "doc-001",
			Content:    "This is a test document about machine learning.",
			Metadata: map[string]any{
				"source": "test-upload",
				"type":   "educational",
			},
			MimeType: stringPtr("text/plain"),
		},
		{
			DocumentID: "doc-002",
			Content:    "Another document about artificial intelligence and neural networks.",
			Metadata: map[string]any{
				"source": "test-upload",
				"type":   "technical",
			},
			MimeType: stringPtr("text/plain"),
		},
	}

	Describe("Upload API", func() {
		Context("when uploading to existing vector DB", func() {
			It("should upload documents successfully", func() {
				uploadRequest := UploadRequest{
					Documents:         testDocuments,
					VectorDBID:        "default-vector-db-id-1", // This exists in mock
					EmbeddingModel:    "text-embedding-ada-002",
					ChunkSizeInTokens: intPtr(512),
				}

				path := testCtx.App.getUploadPath()
				req := JSONRequest("POST", path, uploadRequest)
				resp := MakeRequest(req)

				Expect(resp.StatusCode).To(Equal(http.StatusOK))

				var response map[string]string
				ReadJSONResponse(resp, &response)

				Expect(response["message"]).To(Equal("Documents uploaded successfully"))
				Expect(response["vector_db_id"]).To(Equal(uploadRequest.VectorDBID))
			})
		})

		Context("when uploading to new vector DB", func() {
			It("should upload documents successfully", func() {
				uploadRequest := UploadRequest{
					Documents:      testDocuments,
					VectorDBID:     "new-vector-db-for-testing", // This doesn't exist in mock
					EmbeddingModel: "sentence-transformers",
				}

				req := JSONRequest("POST", testCtx.App.getUploadPath(), uploadRequest)
				resp := MakeRequest(req)

				Expect(resp.StatusCode).To(Equal(http.StatusOK))

				var response map[string]string
				ReadJSONResponse(resp, &response)

				Expect(response["message"]).To(Equal("Documents uploaded successfully"))
				Expect(response["vector_db_id"]).To(Equal(uploadRequest.VectorDBID))
			})
		})

		Context("when documents are missing", func() {
			It("should return 400 bad request", func() {
				uploadRequest := UploadRequest{
					VectorDBID:     "test-db",
					EmbeddingModel: "text-embedding-ada-002",
				}

				req := JSONRequest("POST", testCtx.App.getUploadPath(), uploadRequest)
				resp := MakeRequest(req)

				Expect(resp.StatusCode).To(Equal(http.StatusBadRequest))

				var errorResponse ErrorEnvelope
				ReadJSONResponse(resp, &errorResponse)

				Expect(errorResponse.Error.Code).To(Equal("400"))
				Expect(errorResponse.Error.Message).To(ContainSubstring("documents are required"))
			})
		})

		Context("when documents array is empty", func() {
			It("should return 400 bad request", func() {
				uploadRequest := struct {
					Documents      []interface{} `json:"documents"`
					VectorDBID     string        `json:"vector_db_id"`
					EmbeddingModel string        `json:"embedding_model"`
				}{
					Documents:      []interface{}{},
					VectorDBID:     "test-db",
					EmbeddingModel: "text-embedding-ada-002",
				}

				req := JSONRequest("POST", testCtx.App.getUploadPath(), uploadRequest)
				resp := MakeRequest(req)

				Expect(resp.StatusCode).To(Equal(http.StatusBadRequest))

				var errorResponse ErrorEnvelope
				ReadJSONResponse(resp, &errorResponse)

				Expect(errorResponse.Error.Code).To(Equal("400"))
				Expect(errorResponse.Error.Message).To(ContainSubstring("documents are required"))
			})
		})

		Context("when vector DB ID is missing", func() {
			It("should return 400 bad request", func() {
				uploadRequest := UploadRequest{
					Documents:      testDocuments,
					EmbeddingModel: "text-embedding-ada-002",
				}

				req := JSONRequest("POST", testCtx.App.getUploadPath(), uploadRequest)
				resp := MakeRequest(req)

				Expect(resp.StatusCode).To(Equal(http.StatusBadRequest))

				var errorResponse ErrorEnvelope
				ReadJSONResponse(resp, &errorResponse)

				Expect(errorResponse.Error.Code).To(Equal("400"))
				Expect(errorResponse.Error.Message).To(ContainSubstring("vector_db_id is required"))
			})
		})

		Context("when embedding model is missing", func() {
			It("should return 400 bad request", func() {
				uploadRequest := UploadRequest{
					Documents:  testDocuments,
					VectorDBID: "test-db",
				}

				req := JSONRequest("POST", testCtx.App.getUploadPath(), uploadRequest)
				resp := MakeRequest(req)

				Expect(resp.StatusCode).To(Equal(http.StatusBadRequest))

				var errorResponse ErrorEnvelope
				ReadJSONResponse(resp, &errorResponse)

				Expect(errorResponse.Error.Code).To(Equal("400"))
				Expect(errorResponse.Error.Message).To(ContainSubstring("embedding_model is required"))
			})
		})

		Context("when checking response structure", func() {
			It("should have correct structure and field types", func() {
				uploadRequest := UploadRequest{
					Documents:      testDocuments,
					VectorDBID:     "default-vector-db-id-1",
					EmbeddingModel: "text-embedding-ada-002",
				}

				req := JSONRequest("POST", testCtx.App.getUploadPath(), uploadRequest)
				resp := MakeRequest(req)

				Expect(resp.StatusCode).To(Equal(http.StatusOK))

				// Parse response as generic map to verify structure
				var response map[string]interface{}
				ReadJSONResponse(resp, &response)

				// Verify required fields are present
				Expect(response).To(HaveKey("message"))
				Expect(response).To(HaveKey("vector_db_id"))

				// Verify field types and values
				Expect(response["message"]).To(BeAssignableToTypeOf(""))
				Expect(response["vector_db_id"]).To(BeAssignableToTypeOf(""))
				Expect(response["message"]).To(Equal("Documents uploaded successfully"))
				Expect(response["vector_db_id"]).To(Equal(uploadRequest.VectorDBID))
			})
		})
	})
})
