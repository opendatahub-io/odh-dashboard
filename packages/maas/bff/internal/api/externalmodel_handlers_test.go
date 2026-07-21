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
		Expect(gptModel.MaaSModelRef.GovernanceAttached).To(BeTrue())
		Expect(gptModel.StatusMessage).To(Equal("External model is ready"))
		Expect(gptModel.ProviderRefs[0].Provider.StatusMessage).To(Equal("External provider is ready"))
	})

	It("deletes an ExternalModel and its companion MaaSModelRef", func() {
		const refName = "gpt-4o-external"
		const namespace = "maas-models"

		listBefore, rs1, err := setupApiTest[Envelope[[]models.ExternalModelSummary, None]](
			http.MethodGet,
			fmt.Sprintf("/api/v1/externalmodel?namespace=%s", namespace),
			nil,
			k8Factory,
			identity,
		)
		Expect(err).NotTo(HaveOccurred())
		Expect(rs1.StatusCode).To(Equal(http.StatusOK))

		var found bool
		for _, item := range listBefore.Data {
			if item.Name == refName {
				found = true
				break
			}
		}
		Expect(found).To(BeTrue(), "expected envtest fixture %s to exist before delete", refName)

		_, rs2, err := setupApiTest[Envelope[None, None]](
			http.MethodDelete,
			fmt.Sprintf("/api/v1/externalmodel/%s/%s", namespace, refName),
			nil,
			k8Factory,
			identity,
		)
		Expect(err).NotTo(HaveOccurred())
		Expect(rs2.StatusCode).To(Equal(http.StatusOK))

		_, rs3, err := setupApiTest[Envelope[*models.MaaSModelRefSummary, None]](
			http.MethodPut,
			fmt.Sprintf("/api/v1/maasmodel/%s/%s", namespace, refName),
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

		listAfter, rs4, err := setupApiTest[Envelope[[]models.ExternalModelSummary, None]](
			http.MethodGet,
			fmt.Sprintf("/api/v1/externalmodel?namespace=%s", namespace),
			nil,
			k8Factory,
			identity,
		)
		Expect(err).NotTo(HaveOccurred())
		Expect(rs4.StatusCode).To(Equal(http.StatusOK))

		for _, item := range listAfter.Data {
			Expect(item.Name).NotTo(Equal(refName))
		}
	})
})
