package api

import (
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
})
