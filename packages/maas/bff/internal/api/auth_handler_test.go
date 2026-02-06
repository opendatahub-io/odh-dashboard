package api

import (
	"net/http"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"

	"github.com/opendatahub-io/maas-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

var _ = Describe("AuthHandlers", Ordered, func() {

	var _ = Describe("ListGroupsHandler", Ordered, func() {
		It("Returns 200 and a list of groups", func() {
			identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}

			actual, rs, err := setupApiTest[Envelope[*models.GroupsList, None]](
				http.MethodGet,
				"/api/v1/groups",
				nil,
				k8Factory,
				identity,
			)

			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusOK))
			Expect(actual.Data).NotTo(BeNil())
			Expect(actual.Data.Groups).NotTo(BeNil())
			// Should always include system:authenticated
			Expect(actual.Data.Groups).To(ContainElement("system:authenticated"))
		})

		It("Returns 400 if user ID is missing", func() {
			identity := &kubernetes.RequestIdentity{UserID: ""}

			_, rs, err := setupApiTest[Envelope[*models.GroupsList, None]](
				http.MethodGet,
				"/api/v1/groups",
				nil,
				k8Factory,
				identity,
			)

			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusBadRequest))
		})

		It("Returns groups created in the mock environment", func() {
			identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}

			actual, rs, err := setupApiTest[Envelope[*models.GroupsList, None]](
				http.MethodGet,
				"/api/v1/groups",
				nil,
				k8Factory,
				identity,
			)

			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusOK))
			Expect(actual.Data).NotTo(BeNil())
			// These groups are created in base_testenv.go
			Expect(actual.Data.Groups).To(ContainElements(
				"odh-admins",
				"odh-users",
				"tier0-users",
				"tier1-users",
				"system:authenticated",
			))
		})
	})
})
