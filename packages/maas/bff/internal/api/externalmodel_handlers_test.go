package api

import (
	"fmt"
	"net/http"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"

	"github.com/opendatahub-io/maas-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

var _ = Describe("ExternalModelHandlers", Ordered, func() {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}

	It("lists ExternalModels", func() {
		actual, rs, err := setupApiTest[Envelope[[]models.ExternalModelSummary, None]](
			http.MethodGet,
			"/api/v1/externalmodel?namespace=maas-models",
			nil,
			k8Factory,
			identity,
		)

		Expect(err).NotTo(HaveOccurred())
		Expect(rs.StatusCode).To(Equal(http.StatusOK))
		Expect(len(actual.Data)).To(BeNumerically(">=", 1))

		var gptModel *models.ExternalModelSummary
		for i := range actual.Data {
			if actual.Data[i].Name == "gpt-4o-external" {
				gptModel = &actual.Data[i]
				break
			}
		}
		Expect(gptModel).NotTo(BeNil())
		Expect(gptModel.DisplayName).To(Equal("GPT-4o External"))
		Expect(gptModel.ProviderRefs).NotTo(BeEmpty())
		Expect(gptModel.ProviderRefs[0].Provider).NotTo(BeNil())
		Expect(gptModel.ProviderRefs[0].Provider.EndpointUrl).To(Equal("api.openai.com"))
		Expect(gptModel.ProviderRefs[0].Provider.DisplayName).To(Equal("OpenAI Production"))
		Expect(gptModel.MaaSModelRef).NotTo(BeNil())
		Expect(gptModel.MaaSModelRef.Endpoint).To(Equal("https://gpt-4o-external.maas.example.com"))
		Expect(gptModel.MaaSModelRef.Phase).To(Equal("Ready"))
		Expect(gptModel.MaaSModelRef.StatusMessage).To(Equal("Published external GPT-4o model"))
		Expect(gptModel.StatusMessage).To(Equal("External model is ready"))
		Expect(gptModel.ProviderRefs[0].Provider.StatusMessage).To(Equal("External provider is ready"))
	})

	It("creates an ExternalModel with a companion MaaSModelRef", func() {
		refName := fmt.Sprintf("ext-model-%d", GinkgoRandomSeed())

		actual, rs, err := setupApiTest[Envelope[*models.ExternalModelSummary, None]](
			http.MethodPost,
			"/api/v1/externalmodel",
			Envelope[models.CreateExternalModelRequest, None]{
				Data: models.CreateExternalModelRequest{
					Name:        refName,
					Namespace:   "maas-models",
					DisplayName: "Test External Model",
					Description: "Test description",
					ModelName:   "test-model-id",
					ProviderRefs: []models.ProviderRef{
						{
							ProviderName: "openai-prod",
							Weight:       100,
							APIFormat:    "openai-chat",
							Path:         "/v1/chat/completions",
							TargetModel:  "gpt-4o",
						},
					},
				},
			},
			k8Factory,
			identity,
		)

		Expect(err).NotTo(HaveOccurred())
		Expect(rs.StatusCode).To(Equal(http.StatusCreated))
		Expect(actual.Data.Name).To(Equal(refName))
		Expect(actual.Data.DisplayName).To(Equal("Test External Model"))
		Expect(actual.Data.Description).To(Equal("Test description"))

		modelRef, rs2, err := setupApiTest[Envelope[*models.MaaSModelRefSummary, None]](
			http.MethodPut,
			fmt.Sprintf("/api/v1/maasmodel/maas-models/%s", refName),
			Envelope[models.UpdateMaaSModelRefRequest, None]{
				Data: models.UpdateMaaSModelRefRequest{
					ModelRef: models.ModelReference{Kind: "ExternalModel", Name: refName},
				},
			},
			k8Factory,
			identity,
		)
		Expect(err).NotTo(HaveOccurred())
		Expect(rs2.StatusCode).To(Equal(http.StatusOK))
		Expect(modelRef.Data.ModelRef.Kind).To(Equal("ExternalModel"))
		Expect(modelRef.Data.ModelRef.Name).To(Equal(refName))
	})

	It("deletes an ExternalModel and its companion MaaSModelRef", func() {
		refName := fmt.Sprintf("ext-del-model-%d", GinkgoRandomSeed())

		_, rs1, err := setupApiTest[Envelope[*models.ExternalModelSummary, None]](
			http.MethodPost,
			"/api/v1/externalmodel",
			Envelope[models.CreateExternalModelRequest, None]{
				Data: models.CreateExternalModelRequest{
					Name:        refName,
					Namespace:   "maas-models",
					DisplayName: "Delete Model",
					ProviderRefs: []models.ProviderRef{
						{
							ProviderName: "openai-prod",
							Weight:       100,
							APIFormat:    "openai-chat",
							Path:         "/v1/chat/completions",
							TargetModel:  "gpt-4o",
						},
					},
				},
			},
			k8Factory,
			identity,
		)
		Expect(err).NotTo(HaveOccurred())
		Expect(rs1.StatusCode).To(Equal(http.StatusCreated))

		_, rs2, err := setupApiTest[Envelope[None, None]](
			http.MethodDelete,
			fmt.Sprintf("/api/v1/externalmodel/maas-models/%s", refName),
			nil,
			k8Factory,
			identity,
		)
		Expect(err).NotTo(HaveOccurred())
		Expect(rs2.StatusCode).To(Equal(http.StatusOK))

		_, rs3, err := setupApiTest[Envelope[*models.MaaSModelRefSummary, None]](
			http.MethodPut,
			fmt.Sprintf("/api/v1/maasmodel/maas-models/%s", refName),
			Envelope[models.UpdateMaaSModelRefRequest, None]{
				Data: models.UpdateMaaSModelRefRequest{
					ModelRef: models.ModelReference{Kind: "ExternalModel", Name: refName},
				},
			},
			k8Factory,
			identity,
		)
		Expect(err).NotTo(HaveOccurred())
		Expect(rs3.StatusCode).To(Equal(http.StatusNotFound))
	})
})
