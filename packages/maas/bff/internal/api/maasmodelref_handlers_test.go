package api

import (
	"fmt"
	"net/http"
	"net/http/httptest"

	"github.com/julienschmidt/httprouter"
	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"

	"github.com/opendatahub-io/maas-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

var _ = Describe("MaaSModelRefHandlers", Ordered, func() {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}

	var _ = Describe("CreateMaaSModelRefHandler", Ordered, func() {
		It("returns 201 and the created model ref", func() {
			refName := fmt.Sprintf("test-model-%d", GinkgoRandomSeed())

			actual, rs, err := setupApiTest[models.MaaSModelRefSummary](
				http.MethodPost,
				"/api/v1/maasmodel",
				models.CreateMaaSModelRefRequest{
					Name:      refName,
					Namespace: "maas-models",
					ModelRef: models.ModelReference{
						Kind: "LLMInferenceService",
						Name: "my-llm-model",
					},
					DisplayName: "My LLM Model",
					Description: "A high-performance instruction-tuned language model",
				},
				k8Factory,
				identity,
			)

			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusCreated))
			Expect(actual.Name).To(Equal(refName))
			Expect(actual.Namespace).To(Equal("maas-models"))
			Expect(actual.ModelRef.Kind).To(Equal("LLMInferenceService"))
			Expect(actual.ModelRef.Name).To(Equal("my-llm-model"))
			Expect(actual.DisplayName).To(Equal("My LLM Model"))
			Expect(actual.Description).To(Equal("A high-performance instruction-tuned language model"))
		})

		It("returns 409 when model ref already exists", func() {
			refName := fmt.Sprintf("dup-model-%d", GinkgoRandomSeed())

			// Create first
			_, rs1, err := setupApiTest[models.MaaSModelRefSummary](
				http.MethodPost,
				"/api/v1/maasmodel",
				models.CreateMaaSModelRefRequest{
					Name:      refName,
					Namespace: "maas-models",
					ModelRef: models.ModelReference{
						Kind: "LLMInferenceService",
						Name: "model-a",
					},
				},
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs1.StatusCode).To(Equal(http.StatusCreated))

			// Duplicate
			_, rs2, err := setupApiTest[map[string]interface{}](
				http.MethodPost,
				"/api/v1/maasmodel",
				models.CreateMaaSModelRefRequest{
					Name:      refName,
					Namespace: "maas-models",
					ModelRef: models.ModelReference{
						Kind: "LLMInferenceService",
						Name: "model-a",
					},
				},
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs2.StatusCode).To(Equal(http.StatusConflict))
		})

		It("returns 400 when name is missing", func() {
			_, rs, err := setupApiTest[map[string]interface{}](
				http.MethodPost,
				"/api/v1/maasmodel",
				models.CreateMaaSModelRefRequest{
					Name:      "",
					Namespace: "maas-models",
					ModelRef: models.ModelReference{
						Kind: "LLMInferenceService",
						Name: "model-a",
					},
				},
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusBadRequest))
		})

		It("returns 400 when modelRef.kind is missing", func() {
			_, rs, err := setupApiTest[map[string]interface{}](
				http.MethodPost,
				"/api/v1/maasmodel",
				models.CreateMaaSModelRefRequest{
					Name:      "some-model",
					Namespace: "maas-models",
					ModelRef: models.ModelReference{
						Kind: "",
						Name: "model-a",
					},
				},
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusBadRequest))
		})

		It("returns 201 for a dry-run and does not persist the resource", func() {
			dryRunName := fmt.Sprintf("dry-run-model-%d", GinkgoRandomSeed())

			// Dry-run create should succeed
			actual, rs, err := setupApiTest[models.MaaSModelRefSummary](
				http.MethodPost,
				"/api/v1/maasmodel?dryRun=true",
				models.CreateMaaSModelRefRequest{
					Name:      dryRunName,
					Namespace: "maas-models",
					ModelRef: models.ModelReference{
						Kind: "LLMInferenceService",
						Name: "dry-run-llm",
					},
				},
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusCreated))
			Expect(actual.Name).To(Equal(dryRunName))

			// A subsequent real create should also succeed, showing the dry-run did not persist
			_, rs2, err := setupApiTest[models.MaaSModelRefSummary](
				http.MethodPost,
				"/api/v1/maasmodel",
				models.CreateMaaSModelRefRequest{
					Name:      dryRunName,
					Namespace: "maas-models",
					ModelRef: models.ModelReference{
						Kind: "LLMInferenceService",
						Name: "dry-run-llm",
					},
				},
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs2.StatusCode).To(Equal(http.StatusCreated))
		})
	})

	var _ = Describe("UpdateMaaSModelRefHandler", Ordered, func() {
		BeforeAll(func() {
			_, rs, err := setupApiTest[models.MaaSModelRefSummary](
				http.MethodPost,
				"/api/v1/maasmodel",
				models.CreateMaaSModelRefRequest{
					Name:      "update-test-model",
					Namespace: "maas-models",
					ModelRef: models.ModelReference{
						Kind: "LLMInferenceService",
						Name: "original-model",
					},
				},
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusCreated))
		})

		It("returns 200 and the updated model ref", func() {
			actual, rs, err := setupApiTest[models.MaaSModelRefSummary](
				http.MethodPut,
				"/api/v1/maasmodel/maas-models/update-test-model",
				models.UpdateMaaSModelRefRequest{
					ModelRef: models.ModelReference{
						Kind: "ExternalModel",
						Name: "updated-model",
					},
					EndpointOverride: "https://custom-endpoint.example.com",
					DisplayName:      &[]string{"Updated LLM Model"}[0],
					Description:      &[]string{"A high-performance updated language model"}[0],
				},
				k8Factory,
				identity,
			)

			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusOK))
			Expect(actual.Name).To(Equal("update-test-model"))
			Expect(actual.Namespace).To(Equal("maas-models"))
			Expect(actual.ModelRef.Kind).To(Equal("ExternalModel"))
			Expect(actual.ModelRef.Name).To(Equal("updated-model"))
			Expect(actual.DisplayName).To(Equal("Updated LLM Model"))
			Expect(actual.Description).To(Equal("A high-performance updated language model"))
		})

		It("returns 404 for non-existent model ref", func() {
			_, rs, err := setupApiTest[map[string]interface{}](
				http.MethodPut,
				"/api/v1/maasmodel/maas-models/non-existent-model",
				models.UpdateMaaSModelRefRequest{
					ModelRef: models.ModelReference{
						Kind: "LLMInferenceService",
						Name: "model-a",
					},
				},
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusNotFound))
		})

		It("returns 400 when namespace is empty", func() {
			req := httptest.NewRequest(http.MethodPut, "/api/v1/maasmodel//test", nil)
			rr := httptest.NewRecorder()
			params := httprouter.Params{
				httprouter.Param{Key: "namespace", Value: ""},
				httprouter.Param{Key: "name", Value: "test"},
			}
			UpdateMaaSModelRefHandler(nil, rr, req, params)
			Expect(rr.Code).To(Equal(http.StatusBadRequest))
		})
	})

	var _ = Describe("DeleteMaaSModelRefHandler", Ordered, func() {
		BeforeAll(func() {
			_, rs, err := setupApiTest[models.MaaSModelRefSummary](
				http.MethodPost,
				"/api/v1/maasmodel",
				models.CreateMaaSModelRefRequest{
					Name:      "delete-test-model",
					Namespace: "maas-models",
					ModelRef: models.ModelReference{
						Kind: "LLMInferenceService",
						Name: "to-delete",
					},
				},
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusCreated))
		})

		It("returns 200 and deletes the model ref", func() {
			actual, rs, err := setupApiTest[map[string]string](
				http.MethodDelete,
				"/api/v1/maasmodel/maas-models/delete-test-model",
				nil,
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusOK))
			Expect(actual["message"]).To(ContainSubstring("deleted successfully"))

			// Verify it returns 404 now
			_, rs2, err := setupApiTest[map[string]interface{}](
				http.MethodPut,
				"/api/v1/maasmodel/maas-models/delete-test-model",
				models.UpdateMaaSModelRefRequest{
					ModelRef: models.ModelReference{
						Kind: "LLMInferenceService",
						Name: "model-a",
					},
				},
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs2.StatusCode).To(Equal(http.StatusNotFound))
		})

		It("returns 404 for non-existent model ref", func() {
			_, rs, err := setupApiTest[map[string]interface{}](
				http.MethodDelete,
				"/api/v1/maasmodel/maas-models/non-existent-model",
				nil,
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusNotFound))
		})

		It("returns 400 when name is empty", func() {
			req := httptest.NewRequest(http.MethodDelete, "/api/v1/maasmodel/maas-models/", nil)
			rr := httptest.NewRecorder()
			params := httprouter.Params{
				httprouter.Param{Key: "namespace", Value: "maas-models"},
				httprouter.Param{Key: "name", Value: ""},
			}
			DeleteMaaSModelRefHandler(nil, rr, req, params)
			Expect(rr.Code).To(Equal(http.StatusBadRequest))
		})
	})
})
