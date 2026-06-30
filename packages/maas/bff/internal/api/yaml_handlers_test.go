package api

import (
	"fmt"
	"net/http"
	"strings"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"

	"github.com/opendatahub-io/maas-library/bff/internal/constants"
	"github.com/opendatahub-io/maas-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

var _ = Describe("YamlHandlers", Ordered, func() {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}

	var _ = Describe("GetYamlHandler", Ordered, func() {
		It("returns 200 with subscription YAML for a created subscription", func() {
			subName := fmt.Sprintf("yaml-sub-%d", GinkgoRandomSeed())

			_, rs, err := setupApiTest[Envelope[*models.CreateSubscriptionResponse, None]](
				http.MethodPost,
				"/api/v1/new-subscription",
				Envelope[models.CreateSubscriptionRequest, None]{
					Data: models.CreateSubscriptionRequest{
						Name: subName,
						Owner: models.OwnerSpec{
							Groups: []models.GroupReference{{Name: "premium-users"}},
						},
						ModelRefs: []models.ModelSubscriptionRef{
							{
								Name:      "granite-3-8b-instruct",
								Namespace: "maas-models",
								TokenRateLimits: []models.TokenRateLimit{
									{Limit: 100000, Window: "24h"},
								},
							},
						},
						Priority: 10,
					},
				},
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusCreated))

			actual, rs, err := setupApiTest[models.YamlResponse](
				http.MethodGet,
				fmt.Sprintf("%s?name=%s&type=%s", constants.YamlPath, subName, constants.YamlResourceTypeSubscription),
				nil,
				k8Factory,
				identity,
			)

			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusOK))
			Expect(actual.Content).To(ContainSubstring("kind: MaaSSubscription"))
			Expect(actual.Content).To(ContainSubstring("name: " + subName))
			Expect(actual.Content).To(ContainSubstring("apiVersion: maas.opendatahub.io/v1alpha1"))
			Expect(actual.Content).To(ContainSubstring("granite-3-8b-instruct"))
			Expect(actual.Content).NotTo(ContainSubstring("managedFields:"))
			Expect(actual.Content).NotTo(ContainSubstring("resourceVersion:"))
			Expect(actual.Content).NotTo(ContainSubstring("uid:"))
			Expect(actual.Content).NotTo(ContainSubstring("generation:"))
			Expect(actual.Content).NotTo(ContainSubstring("status:"))
			Expect(actual.Content).NotTo(ContainSubstring("kubectl.kubernetes.io/last-applied-configuration"))
		})

		It("returns 200 with auth policy YAML for a created subscription policy", func() {
			subName := fmt.Sprintf("yaml-policy-sub-%d", GinkgoRandomSeed())
			policyName := subName + "-policy"

			_, rs, err := setupApiTest[Envelope[*models.CreateSubscriptionResponse, None]](
				http.MethodPost,
				"/api/v1/new-subscription",
				Envelope[models.CreateSubscriptionRequest, None]{
					Data: models.CreateSubscriptionRequest{
						Name: subName,
						Owner: models.OwnerSpec{
							Groups: []models.GroupReference{{Name: "premium-users"}},
						},
						ModelRefs: []models.ModelSubscriptionRef{
							{
								Name:      "granite-3-8b-instruct",
								Namespace: "maas-models",
								TokenRateLimits: []models.TokenRateLimit{
									{Limit: 100000, Window: "24h"},
								},
							},
						},
						CreateAuthPolicy: true,
					},
				},
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusCreated))

			actual, rs, err := setupApiTest[models.YamlResponse](
				http.MethodGet,
				fmt.Sprintf("%s?name=%s&type=%s", constants.YamlPath, policyName, constants.YamlResourceTypeAuthorizationPolicy),
				nil,
				k8Factory,
				identity,
			)

			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusOK))
			Expect(actual.Content).To(ContainSubstring("kind: MaaSAuthPolicy"))
			Expect(actual.Content).To(ContainSubstring("name: " + policyName))
			Expect(actual.Content).To(ContainSubstring("apiVersion: maas.opendatahub.io/v1alpha1"))
			Expect(actual.Content).To(ContainSubstring("premium-users"))
			Expect(actual.Content).NotTo(ContainSubstring("managedFields:"))
			Expect(actual.Content).NotTo(ContainSubstring("resourceVersion:"))
			Expect(actual.Content).NotTo(ContainSubstring("uid:"))
			Expect(actual.Content).NotTo(ContainSubstring("generation:"))
			Expect(actual.Content).NotTo(ContainSubstring("status:"))
			Expect(actual.Content).NotTo(ContainSubstring("kubectl.kubernetes.io/last-applied-configuration"))
		})

		It("returns 400 for an invalid resource type", func() {
			actual, rs, err := setupApiTest[HTTPError](
				http.MethodGet,
				constants.YamlPath+"?name=test-sub&type=invalid",
				nil,
				k8Factory,
				identity,
			)

			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusBadRequest))
			Expect(strings.ToLower(actual.Error.Message)).To(ContainSubstring("invalid resource type"))
		})

		It("returns 400 when name is missing", func() {
			actual, rs, err := setupApiTest[HTTPError](
				http.MethodGet,
				constants.YamlPath+"?type="+constants.YamlResourceTypeSubscription,
				nil,
				k8Factory,
				identity,
			)

			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusBadRequest))
			Expect(actual.Error.Message).To(ContainSubstring("name is required"))
		})

		It("returns 400 when type is missing", func() {
			actual, rs, err := setupApiTest[HTTPError](
				http.MethodGet,
				constants.YamlPath+"?name=test-sub",
				nil,
				k8Factory,
				identity,
			)

			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusBadRequest))
			Expect(actual.Error.Message).To(ContainSubstring("type is required"))
		})

		It("returns 400 when name is invalid", func() {
			actual, rs, err := setupApiTest[HTTPError](
				http.MethodGet,
				constants.YamlPath+"?name=invalid name&type="+constants.YamlResourceTypeSubscription,
				nil,
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusBadRequest))
			Expect(actual.Error.Message).To(ContainSubstring("invalid name"))
		})

		It("returns 400 when type is invalid", func() {
			actual, rs, err := setupApiTest[HTTPError](
				http.MethodGet,
				constants.YamlPath+"?name=test-sub&type=some-non-supported-type",
				nil,
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusBadRequest))
			Expect(actual.Error.Message).To(ContainSubstring("invalid resource type"))
		})

		It("returns 404 for a non-existent subscription", func() {
			_, rs, err := setupApiTest[HTTPError](
				http.MethodGet,
				constants.YamlPath+"?name=non-existent-sub&type="+constants.YamlResourceTypeSubscription,
				nil,
				k8Factory,
				identity,
			)

			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusNotFound))
		})
	})
})
