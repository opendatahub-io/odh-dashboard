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

	It("creates an ExternalProvider", func() {
		name := fmt.Sprintf("test-provider-%d", GinkgoRandomSeed())
		actual, rs, err := setupMockApiTest[Envelope[*models.ExternalProviderSummary, None]](
			http.MethodPost,
			"/api/v1/externalprovider",
			Envelope[models.CreateExternalProviderRequest, None]{
				Data: models.CreateExternalProviderRequest{
					Name:                name,
					Namespace:           "maas-models",
					DisplayName:         "Test Provider",
					EndpointUrl:         "api.example.com",
					AuthMechanism:       models.AuthMechanismAPIKey,
					CredentialSecretRef: "test-api-key",
					Provider:            "openai",
				},
			},
			k8Factory,
			identity,
		)

		Expect(err).NotTo(HaveOccurred())
		Expect(rs.StatusCode).To(Equal(http.StatusCreated))
		Expect(actual.Data).NotTo(BeNil())
		Expect(actual.Data.Name).To(Equal(name))
		Expect(actual.Data.Namespace).To(Equal("maas-models"))
		Expect(actual.Data.DisplayName).To(Equal("Test Provider"))
		Expect(actual.Data.Provider).To(Equal("openai"))
		Expect(actual.Data.CredentialSecretRef).To(Equal("test-api-key"))
	})

	It("updates an ExternalProvider", func() {
		displayName := "Updated OpenAI"
		actual, rs, err := setupMockApiTest[Envelope[*models.ExternalProviderSummary, None]](
			http.MethodPut,
			"/api/v1/externalprovider/maas-models/openai-prod",
			Envelope[models.UpdateExternalProviderRequest, None]{
				Data: models.UpdateExternalProviderRequest{
					DisplayName: &displayName,
				},
			},
			k8Factory,
			identity,
		)

		Expect(err).NotTo(HaveOccurred())
		Expect(rs.StatusCode).To(Equal(http.StatusOK))
		Expect(actual.Data).NotTo(BeNil())
		Expect(actual.Data.Name).To(Equal("openai-prod"))
		Expect(actual.Data.DisplayName).To(Equal(displayName))
	})

	It("deletes an ExternalProvider", func() {
		_, rs, err := setupMockApiTest[Envelope[None, None]](
			http.MethodDelete,
			"/api/v1/externalprovider/maas-models/openai-prod",
			nil,
			k8Factory,
			identity,
		)

		Expect(err).NotTo(HaveOccurred())
		Expect(rs.StatusCode).To(Equal(http.StatusOK))
	})
})
