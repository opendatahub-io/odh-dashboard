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

var _ = Describe("SubscriptionHandlers", Ordered, func() {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}

	var _ = Describe("CreateSubscriptionHandler", Ordered, func() {
		It("returns 201 and the created subscription with auth policy", func() {
			subName := fmt.Sprintf("test-sub-%d", GinkgoRandomSeed())

			actual, rs, err := setupApiTest[models.CreateSubscriptionResponse](
				http.MethodPost,
				"/api/v1/new-subscription",
				models.CreateSubscriptionRequest{
					Name: subName,
					Owner: models.OwnerSpec{
						Groups: []models.GroupReference{
							{Name: "premium-users"},
						},
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
					TokenMetadata: &models.TokenMetadata{
						OrganizationID: "org-123",
						CostCenter:     "engineering",
					},
					Priority:         10,
					CreateAuthPolicy: true,
				},
				k8Factory,
				identity,
			)

			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusCreated))
			Expect(actual.Subscription.Name).To(Equal(subName))
			Expect(actual.Subscription.Namespace).To(Equal("maas-system"))
			Expect(actual.Subscription.Priority).To(Equal(int32(10)))
			Expect(actual.Subscription.Owner.Groups).To(HaveLen(1))
			Expect(actual.Subscription.Owner.Groups[0].Name).To(Equal("premium-users"))
			Expect(actual.Subscription.ModelRefs).To(HaveLen(1))
			Expect(actual.Subscription.ModelRefs[0].Name).To(Equal("granite-3-8b-instruct"))
			Expect(actual.Subscription.ModelRefs[0].TokenRateLimits).To(HaveLen(1))
			Expect(actual.Subscription.ModelRefs[0].TokenRateLimits[0].Limit).To(Equal(int64(100000)))
			Expect(actual.Subscription.TokenMetadata).NotTo(BeNil())
			Expect(actual.Subscription.TokenMetadata.OrganizationID).To(Equal("org-123"))

			// Auth policy should also be created
			Expect(actual.AuthPolicy).NotTo(BeNil())
			Expect(actual.AuthPolicy.Name).To(Equal(subName + "-policy"))
			Expect(actual.AuthPolicy.Namespace).To(Equal("maas-system"))
			Expect(actual.AuthPolicy.ModelRefs).To(HaveLen(1))
			Expect(actual.AuthPolicy.ModelRefs[0].Name).To(Equal("granite-3-8b-instruct"))
			Expect(actual.AuthPolicy.Subjects.Groups).To(HaveLen(1))
			Expect(actual.AuthPolicy.Subjects.Groups[0].Name).To(Equal("premium-users"))
		})

		It("returns 409 when subscription already exists", func() {
			subName := fmt.Sprintf("dup-sub-%d", GinkgoRandomSeed())

			// Create first
			_, rs1, err := setupApiTest[models.CreateSubscriptionResponse](
				http.MethodPost,
				"/api/v1/new-subscription",
				models.CreateSubscriptionRequest{
					Name: subName,
					Owner: models.OwnerSpec{
						Groups: []models.GroupReference{{Name: "users"}},
					},
					ModelRefs: []models.ModelSubscriptionRef{
						{Name: "granite-3-8b-instruct", Namespace: "maas-models"},
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
				"/api/v1/new-subscription",
				models.CreateSubscriptionRequest{
					Name: subName,
					Owner: models.OwnerSpec{
						Groups: []models.GroupReference{{Name: "users"}},
					},
					ModelRefs: []models.ModelSubscriptionRef{
						{Name: "granite-3-8b-instruct", Namespace: "maas-models"},
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
				"/api/v1/new-subscription",
				models.CreateSubscriptionRequest{
					Name: "",
					ModelRefs: []models.ModelSubscriptionRef{
						{Name: "granite-3-8b-instruct", Namespace: "maas-models"},
					},
				},
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusBadRequest))
		})

		It("returns 400 when modelRefs is empty", func() {
			_, rs, err := setupApiTest[map[string]interface{}](
				http.MethodPost,
				"/api/v1/new-subscription",
				models.CreateSubscriptionRequest{
					Name:      "no-models-sub",
					ModelRefs: []models.ModelSubscriptionRef{},
				},
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusBadRequest))
		})
	})

	var _ = Describe("ListSubscriptionsHandler", Ordered, func() {
		BeforeAll(func() {
			// Seed a subscription for listing
			_, rs, err := setupApiTest[models.CreateSubscriptionResponse](
				http.MethodPost,
				"/api/v1/new-subscription",
				models.CreateSubscriptionRequest{
					Name: "list-test-sub",
					Owner: models.OwnerSpec{
						Groups: []models.GroupReference{{Name: "users"}},
					},
					ModelRefs: []models.ModelSubscriptionRef{
						{Name: "granite-3-8b-instruct", Namespace: "maas-models"},
					},
				},
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusCreated))
		})

		It("returns 200 and a list of subscriptions", func() {
			actual, rs, err := setupApiTest[Envelope[[]models.MaaSSubscription, None]](
				http.MethodGet,
				"/api/v1/all-subscriptions",
				nil,
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusOK))
			Expect(actual.Data).NotTo(BeNil())
			Expect(len(actual.Data)).Should(BeNumerically(">", 0))

			// Find our seeded subscription
			found := false
			for _, sub := range actual.Data {
				if sub.Name == "list-test-sub" {
					found = true
					Expect(sub.Namespace).To(Equal("maas-system"))
					break
				}
			}
			Expect(found).To(BeTrue(), "list-test-sub should be in the list")
		})
	})

	var _ = Describe("GetSubscriptionInfoHandler", Ordered, func() {
		BeforeAll(func() {
			_, rs, err := setupApiTest[models.CreateSubscriptionResponse](
				http.MethodPost,
				"/api/v1/new-subscription",
				models.CreateSubscriptionRequest{
					Name: "info-test-sub",
					Owner: models.OwnerSpec{
						Groups: []models.GroupReference{{Name: "premium-users"}},
					},
					ModelRefs: []models.ModelSubscriptionRef{
						{Name: "granite-3-8b-instruct", Namespace: "maas-models"},
					},
					TokenMetadata: &models.TokenMetadata{
						OrganizationID: "org-456",
					},
					Priority: 5,
				},
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusCreated))
		})

		It("returns 200 with subscription info, model refs, and auth policies", func() {
			actual, rs, err := setupApiTest[models.SubscriptionInfoResponse](
				http.MethodGet,
				"/api/v1/subscription-info/info-test-sub",
				nil,
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusOK))
			Expect(actual.Subscription.Name).To(Equal("info-test-sub"))
			Expect(actual.Subscription.Namespace).To(Equal("maas-system"))
			Expect(actual.Subscription.Priority).To(Equal(int32(5)))
			Expect(actual.Subscription.TokenMetadata).NotTo(BeNil())
			Expect(actual.Subscription.TokenMetadata.OrganizationID).To(Equal("org-456"))

			// Should have the model ref summary
			Expect(actual.ModelRefs).To(HaveLen(1))
			Expect(actual.ModelRefs[0].Name).To(Equal("granite-3-8b-instruct"))

			// Auth policies may be empty if not created with the subscription
			Expect(actual.AuthPolicies).NotTo(BeNil())
		})

		It("returns 404 for non-existent subscription", func() {
			_, rs, err := setupApiTest[map[string]interface{}](
				http.MethodGet,
				"/api/v1/subscription-info/non-existent-sub",
				nil,
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusNotFound))
		})

		It("returns 400 when name is empty", func() {
			req := httptest.NewRequest(http.MethodGet, "/api/v1/subscription-info/", nil)
			rr := httptest.NewRecorder()
			params := httprouter.Params{httprouter.Param{Key: "name", Value: ""}}
			GetSubscriptionInfoHandler(nil, rr, req, params)
			Expect(rr.Code).To(Equal(http.StatusBadRequest))
		})
	})

	var _ = Describe("GetSubscriptionFormDataHandler", Ordered, func() {
		It("returns 200 with groups and model refs", func() {
			actual, rs, err := setupApiTest[models.SubscriptionFormDataResponse](
				http.MethodGet,
				"/api/v1/new-subscription",
				nil,
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusOK))

			// Should have at least the model refs seeded in test env
			Expect(len(actual.ModelRefs)).To(BeNumerically(">=", 2))
			var names []string
			for _, ref := range actual.ModelRefs {
				names = append(names, ref.Name)
			}
			Expect(names).To(ContainElements("granite-3-8b-instruct", "flan-t5-small"))

			// Groups fallback to system:authenticated since envtest doesn't have user.openshift.io
			Expect(actual.Groups).To(ContainElement("system:authenticated"))
		})
	})

	var _ = Describe("UpdateSubscriptionHandler", Ordered, func() {
		BeforeAll(func() {
			_, rs, err := setupApiTest[models.CreateSubscriptionResponse](
				http.MethodPost,
				"/api/v1/new-subscription",
				models.CreateSubscriptionRequest{
					Name: "update-test-sub",
					Owner: models.OwnerSpec{
						Groups: []models.GroupReference{{Name: "users"}},
					},
					ModelRefs: []models.ModelSubscriptionRef{
						{Name: "granite-3-8b-instruct", Namespace: "maas-models"},
					},
					Priority: 1,
				},
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusCreated))
		})

		It("returns 200 and the updated subscription", func() {
			actual, rs, err := setupApiTest[models.CreateSubscriptionResponse](
				http.MethodPut,
				"/api/v1/update-subscription/update-test-sub",
				models.UpdateSubscriptionRequest{
					Owner: models.OwnerSpec{
						Groups: []models.GroupReference{{Name: "premium-users"}},
					},
					ModelRefs: []models.ModelSubscriptionRef{
						{Name: "granite-3-8b-instruct", Namespace: "maas-models"},
						{Name: "flan-t5-small", Namespace: "maas-models"},
					},
					TokenMetadata: &models.TokenMetadata{
						OrganizationID: "updated-org",
					},
					Priority: 20,
				},
				k8Factory,
				identity,
			)

			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusOK))
			Expect(actual.Subscription.Name).To(Equal("update-test-sub"))
			Expect(actual.Subscription.Priority).To(Equal(int32(20)))
			Expect(actual.Subscription.Owner.Groups).To(HaveLen(1))
			Expect(actual.Subscription.Owner.Groups[0].Name).To(Equal("premium-users"))
			Expect(actual.Subscription.ModelRefs).To(HaveLen(2))
			Expect(actual.Subscription.TokenMetadata).NotTo(BeNil())
			Expect(actual.Subscription.TokenMetadata.OrganizationID).To(Equal("updated-org"))

			// Auth policy is not managed during update
			Expect(actual.AuthPolicy).To(BeNil())
		})

		It("returns 404 for non-existent subscription", func() {
			_, rs, err := setupApiTest[map[string]interface{}](
				http.MethodPut,
				"/api/v1/update-subscription/non-existent-sub",
				models.UpdateSubscriptionRequest{
					Owner: models.OwnerSpec{
						Groups: []models.GroupReference{{Name: "users"}},
					},
					ModelRefs: []models.ModelSubscriptionRef{
						{Name: "granite-3-8b-instruct", Namespace: "maas-models"},
					},
				},
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusNotFound))
		})

		It("returns 400 when modelRefs is empty", func() {
			_, rs, err := setupApiTest[map[string]interface{}](
				http.MethodPut,
				"/api/v1/update-subscription/update-test-sub",
				models.UpdateSubscriptionRequest{
					Owner: models.OwnerSpec{
						Groups: []models.GroupReference{{Name: "users"}},
					},
					ModelRefs: []models.ModelSubscriptionRef{},
				},
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusBadRequest))
		})
	})

	var _ = Describe("DeleteSubscriptionHandler", Ordered, func() {
		BeforeAll(func() {
			_, rs, err := setupApiTest[models.CreateSubscriptionResponse](
				http.MethodPost,
				"/api/v1/new-subscription",
				models.CreateSubscriptionRequest{
					Name: "delete-test-sub",
					Owner: models.OwnerSpec{
						Groups: []models.GroupReference{{Name: "users"}},
					},
					ModelRefs: []models.ModelSubscriptionRef{
						{Name: "granite-3-8b-instruct", Namespace: "maas-models"},
					},
				},
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusCreated))
		})

		It("returns 200 and deletes the subscription", func() {
			actual, rs, err := setupApiTest[map[string]string](
				http.MethodDelete,
				"/api/v1/subscription/delete-test-sub",
				nil,
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusOK))
			Expect(actual["message"]).To(ContainSubstring("deleted successfully"))

			// Verify it's gone
			_, rs2, err := setupApiTest[map[string]interface{}](
				http.MethodGet,
				"/api/v1/subscription-info/delete-test-sub",
				nil,
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs2.StatusCode).To(Equal(http.StatusNotFound))
		})

		It("returns 404 for non-existent subscription", func() {
			_, rs, err := setupApiTest[map[string]interface{}](
				http.MethodDelete,
				"/api/v1/subscription/non-existent-sub",
				nil,
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusNotFound))
		})

		It("returns 400 when name is empty", func() {
			req := httptest.NewRequest(http.MethodDelete, "/api/v1/subscription/", nil)
			rr := httptest.NewRecorder()
			params := httprouter.Params{httprouter.Param{Key: "name", Value: ""}}
			DeleteSubscriptionHandler(nil, rr, req, params)
			Expect(rr.Code).To(Equal(http.StatusBadRequest))
		})
	})
})
