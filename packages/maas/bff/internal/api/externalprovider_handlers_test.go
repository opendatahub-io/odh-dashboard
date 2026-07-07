package api

import (
	"fmt"
	"net/http"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"

	"github.com/opendatahub-io/maas-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

var _ = Describe("ExternalProviderHandlers", Ordered, func() {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}

	It("lists ExternalProviders in a namespace", func() {
		actual, rs, err := setupApiTest[Envelope[[]models.ExternalProviderSummary, None]](
			http.MethodGet,
			"/api/v1/externalprovider?namespace=maas-models",
			nil,
			k8Factory,
			identity,
		)

		Expect(err).NotTo(HaveOccurred())
		Expect(rs.StatusCode).To(Equal(http.StatusOK))
		Expect(len(actual.Data)).To(BeNumerically(">=", 1))
		Expect(actual.Data[0].DisplayName).NotTo(BeEmpty())
	})

	It("creates an ExternalProvider with display annotations", func() {
		refName := fmt.Sprintf("test-provider-%d", GinkgoRandomSeed())

		actual, rs, err := setupApiTest[Envelope[*models.ExternalProviderSummary, None]](
			http.MethodPost,
			"/api/v1/externalprovider",
			Envelope[models.CreateExternalProviderRequest, None]{
				Data: models.CreateExternalProviderRequest{
					Name:                refName,
					Namespace:           "maas-models",
					DisplayName:         "Test Provider",
					Description:         "A test external provider.",
					EndpointUrl:         "https://api.example.com",
					AuthMechanism:       models.AuthMechanismAPIKey,
					CredentialSecretRef: "openai-api-key",
					Provider:            "openai",
				},
			},
			k8Factory,
			identity,
		)

		Expect(err).NotTo(HaveOccurred())
		Expect(rs.StatusCode).To(Equal(http.StatusCreated))
		Expect(actual.Data.Name).To(Equal(refName))
		Expect(actual.Data.DisplayName).To(Equal("Test Provider"))
		Expect(actual.Data.Description).To(Equal("A test external provider."))
		Expect(actual.Data.EndpointUrl).To(Equal("api.example.com"))
	})

	It("updates description and clears it when empty", func() {
		refName := fmt.Sprintf("upd-provider-%d", GinkgoRandomSeed())

		_, rs1, err := setupApiTest[Envelope[*models.ExternalProviderSummary, None]](
			http.MethodPost,
			"/api/v1/externalprovider",
			Envelope[models.CreateExternalProviderRequest, None]{
				Data: models.CreateExternalProviderRequest{
					Name:                refName,
					Namespace:           "maas-models",
					DisplayName:         "Updatable Provider",
					Description:         "Initial description",
					EndpointUrl:         "api.example.com",
					AuthMechanism:       models.AuthMechanismAPIKey,
					CredentialSecretRef: "openai-api-key",
					Provider:            "openai",
				},
			},
			k8Factory,
			identity,
		)
		Expect(err).NotTo(HaveOccurred())
		Expect(rs1.StatusCode).To(Equal(http.StatusCreated))

		emptyDesc := ""
		actual, rs2, err := setupApiTest[Envelope[*models.ExternalProviderSummary, None]](
			http.MethodPut,
			fmt.Sprintf("/api/v1/externalprovider/maas-models/%s", refName),
			Envelope[models.UpdateExternalProviderRequest, None]{
				Data: models.UpdateExternalProviderRequest{
					Description: &emptyDesc,
				},
			},
			k8Factory,
			identity,
		)
		Expect(err).NotTo(HaveOccurred())
		Expect(rs2.StatusCode).To(Equal(http.StatusOK))
		Expect(actual.Data.Description).To(BeEmpty())
	})

	It("deletes an ExternalProvider", func() {
		refName := fmt.Sprintf("del-provider-%d", GinkgoRandomSeed())

		_, rs1, err := setupApiTest[Envelope[*models.ExternalProviderSummary, None]](
			http.MethodPost,
			"/api/v1/externalprovider",
			Envelope[models.CreateExternalProviderRequest, None]{
				Data: models.CreateExternalProviderRequest{
					Name:                refName,
					Namespace:           "maas-models",
					DisplayName:         "Delete Me",
					EndpointUrl:         "api.example.com",
					AuthMechanism:       models.AuthMechanismAPIKey,
					CredentialSecretRef: "openai-api-key",
					Provider:            "openai",
				},
			},
			k8Factory,
			identity,
		)
		Expect(err).NotTo(HaveOccurred())
		Expect(rs1.StatusCode).To(Equal(http.StatusCreated))

		_, rs2, err := setupApiTest[Envelope[None, None]](
			http.MethodDelete,
			fmt.Sprintf("/api/v1/externalprovider/maas-models/%s", refName),
			nil,
			k8Factory,
			identity,
		)
		Expect(err).NotTo(HaveOccurred())
		Expect(rs2.StatusCode).To(Equal(http.StatusOK))
	})
})
