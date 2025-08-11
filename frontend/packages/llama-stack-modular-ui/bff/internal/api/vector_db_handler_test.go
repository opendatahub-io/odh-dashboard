package api

import (
	"net/http"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/mocks"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/models"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/repositories"
)

// reset the mock's registered vector DBs after each test
func cleanupMockState() {
	freshMockClient, err := mocks.NewLlamastackClientMock()
	if err != nil {
		return
	}

	testCtx.App.repositories = repositories.NewRepositories(freshMockClient)
}

var _ = Describe("Vector DB Handler", func() {
	var ExpectedVectorDBs []models.VectorDB

	BeforeEach(func() {
		ExpectedVectorDBs = []models.VectorDB{
			{
				Identifier:         "default-vector-db-id-1",
				ProviderID:         "default-provider-id-1",
				ProviderResourceID: "default-provider-resource-id-1",
				EmbeddingDimension: 1536,
				EmbeddingModel:     "default-embedding-model-1",
			},
			{
				Identifier:         "default-vector-db-id-2",
				ProviderID:         "default-provider-id-2",
				ProviderResourceID: "default-provider-resource-id-2",
				EmbeddingDimension: 1536,
				EmbeddingModel:     "default-embedding-model-2",
			},
		}
	})

	AfterEach(func() {
		cleanupMockState()
	})

	Describe("Vector DB Registration API", func() {
		Context("when registering a new vector DB", func() {
			It("should register successfully", func() {
				registrationRequest := VectorDBRegistrationRequest{
					VectorDBID:     "test-vector-db",
					EmbeddingModel: "text-embedding-ada-002",
				}

				req := JSONRequest("POST", testCtx.App.getVectorDBListPath(), registrationRequest)
				resp := MakeRequest(req)

				Expect(resp.StatusCode).To(Equal(http.StatusCreated))

				var response map[string]string
				ReadJSONResponse(resp, &response)

				Expect(response["message"]).To(Equal("Vector database registered successfully"))
				Expect(response["vector_db_id"]).To(Equal(registrationRequest.VectorDBID))
			})
		})

		Context("when vector DB ID is missing", func() {
			It("should return 400 bad request", func() {
				registrationRequest := VectorDBRegistrationRequest{
					EmbeddingModel: "text-embedding-ada-002",
				}

				req := JSONRequest("POST", testCtx.App.getVectorDBListPath(), registrationRequest)
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
				registrationRequest := VectorDBRegistrationRequest{
					VectorDBID: "test-db",
				}

				req := JSONRequest("POST", testCtx.App.getVectorDBListPath(), registrationRequest)
				resp := MakeRequest(req)

				Expect(resp.StatusCode).To(Equal(http.StatusBadRequest))

				var errorResponse ErrorEnvelope
				ReadJSONResponse(resp, &errorResponse)

				Expect(errorResponse.Error.Code).To(Equal("400"))
				Expect(errorResponse.Error.Message).To(ContainSubstring("embedding_model is required"))
			})
		})
	})

	Describe("Vector DB List API", func() {
		Context("when requesting all vector DBs", func() {
			It("should return default vector DBs successfully", func() {
				path := testCtx.App.getVectorDBListPath()
				req := JSONRequest("GET", path, nil)

				resp := MakeRequest(req)
				Expect(resp.StatusCode).To(Equal(http.StatusOK))

				var result VectorDBListEnvelope
				ReadJSONResponse(resp, &result)

				// Verify default vector DBs are returned (mock returns 2 default vector DBs)
				Expect(result.Data.Items).To(HaveLen(2))
				Expect(result.Data.Items).To(Equal(ExpectedVectorDBs))
			})
		})

		Context("when a vector DB has been registered", func() {
			It("should include the registered DB in the list", func() {
				// First register a new vector DB
				registrationRequest := VectorDBRegistrationRequest{
					VectorDBID:     "newly-registered-db",
					EmbeddingModel: "sentence-transformers",
				}

				registerReq := JSONRequest("POST", testCtx.App.getVectorDBListPath(), registrationRequest)
				registerResp := MakeRequest(registerReq)

				Expect(registerResp.StatusCode).To(Equal(http.StatusCreated))

				// Now get all vector DBs
				listReq := JSONRequest("GET", testCtx.App.getVectorDBListPath(), nil)

				listResp := MakeRequest(listReq)
				Expect(listResp.StatusCode).To(Equal(http.StatusOK))

				var result VectorDBListEnvelope
				ReadJSONResponse(listResp, &result)

				// Should have 3 vector DBs now (2 defaults + 1 registered)
				Expect(result.Data.Items).To(HaveLen(3))

				// Verify the newly registered DB is included
				var foundRegisteredDB bool
				for _, vectorDB := range result.Data.Items {
					if vectorDB.Identifier == "newly-registered-db" {
						foundRegisteredDB = true
						Expect(vectorDB.ProviderID).To(Equal("inline::milvus"))
						Expect(vectorDB.ProviderResourceID).To(Equal("newly-registered-db"))
						Expect(vectorDB.EmbeddingDimension).To(Equal(int64(384)))
						Expect(vectorDB.EmbeddingModel).To(Equal("sentence-transformers"))
						break
					}
				}
				Expect(foundRegisteredDB).To(BeTrue())
			})
		})

		Context("when checking response structure", func() {
			It("should have correct envelope structure", func() {
				req := JSONRequest("GET", testCtx.App.getVectorDBListPath(), nil)

				resp := MakeRequest(req)
				Expect(resp.StatusCode).To(Equal(http.StatusOK))

				// Parse response as generic map to verify structure
				var response map[string]interface{}
				ReadJSONResponse(resp, &response)

				// Verify envelope structure
				Expect(response).To(HaveKey("data"))

				data, ok := response["data"].(map[string]interface{})
				Expect(ok).To(BeTrue())
				Expect(data).To(HaveKey("items"))

				// Default vector DBs
				items, ok := data["items"].([]interface{})
				Expect(ok).To(BeTrue())
				Expect(items).To(HaveLen(2))

				// Verify vector DB structure
				firstVectorDB, ok := items[0].(map[string]interface{})
				Expect(ok).To(BeTrue())
				Expect(firstVectorDB).To(HaveKey("identifier"))
				Expect(firstVectorDB).To(HaveKey("provider_id"))
				Expect(firstVectorDB).To(HaveKey("provider_resource_id"))
				Expect(firstVectorDB).To(HaveKey("embedding_dimension"))
				Expect(firstVectorDB).To(HaveKey("embedding_model"))

				// Verify field types and values
				Expect(firstVectorDB["identifier"]).To(BeAssignableToTypeOf(""))
				Expect(firstVectorDB["provider_id"]).To(BeAssignableToTypeOf(""))
				Expect(firstVectorDB["provider_resource_id"]).To(BeAssignableToTypeOf(""))
				Expect(firstVectorDB["embedding_dimension"]).To(BeNumerically("==", 1536))
				Expect(firstVectorDB["embedding_model"]).To(BeAssignableToTypeOf(""))
			})
		})
	})
})
