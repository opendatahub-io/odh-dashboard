package api

import (
	"fmt"
	"net/http"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"

	"github.com/opendatahub-io/maas-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

var _ = Describe("SecretHandlers", Ordered, func() {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}

	It("lists Secrets in a namespace (mock)", func() {
		actual, rs, err := setupMockApiTest[Envelope[[]models.SecretSummary, None]](
			http.MethodGet,
			"/api/v1/secrets?namespace=maas-models",
			nil,
			k8Factory,
			identity,
		)

		Expect(err).NotTo(HaveOccurred())
		Expect(rs.StatusCode).To(Equal(http.StatusOK))
		Expect(len(actual.Data)).To(BeNumerically(">=", 1))
		Expect(actual.Data[0].Name).NotTo(BeEmpty())
	})

	It("creates a Secret (mock)", func() {
		name := fmt.Sprintf("test-secret-%d", GinkgoRandomSeed())
		actual, rs, err := setupMockApiTest[Envelope[*models.CreateSecretResponse, None]](
			http.MethodPost,
			"/api/v1/secrets",
			Envelope[models.CreateSecretRequest, None]{
				Data: models.CreateSecretRequest{
					Namespace: "maas-models",
					Name:      name,
					Value:     "sk-test",
				},
			},
			k8Factory,
			identity,
		)

		Expect(err).NotTo(HaveOccurred())
		Expect(rs.StatusCode).To(Equal(http.StatusCreated))
		Expect(actual.Data).NotTo(BeNil())
		Expect(actual.Data.Name).To(Equal(name))
	})

	It("creates and lists BBR-managed Secrets on the cluster", func() {
		name := fmt.Sprintf("live-secret-%d", GinkgoRandomSeed())
		const namespace = "maas-models"

		created, rs, err := setupApiTest[Envelope[*models.CreateSecretResponse, None]](
			http.MethodPost,
			"/api/v1/secrets",
			Envelope[models.CreateSecretRequest, None]{
				Data: models.CreateSecretRequest{
					Namespace: namespace,
					Name:      name,
					Value:     "sk-live-test",
				},
			},
			k8Factory,
			identity,
		)
		Expect(err).NotTo(HaveOccurred())
		Expect(rs.StatusCode).To(Equal(http.StatusCreated))
		Expect(created.Data).NotTo(BeNil())
		Expect(created.Data.Name).To(Equal(name))

		listed, rs, err := setupApiTest[Envelope[[]models.SecretSummary, None]](
			http.MethodGet,
			fmt.Sprintf("/api/v1/secrets?namespace=%s", namespace),
			nil,
			k8Factory,
			identity,
		)
		Expect(err).NotTo(HaveOccurred())
		Expect(rs.StatusCode).To(Equal(http.StatusOK))

		var found bool
		for _, item := range listed.Data {
			if item.Name == name {
				found = true
				break
			}
		}
		Expect(found).To(BeTrue(), "expected created secret %s in BBR-managed list", name)
	})
})
