package api

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"

	"github.com/julienschmidt/httprouter"
	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

	"github.com/opendatahub-io/maas-library/bff/internal/constants"
	"github.com/opendatahub-io/maas-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

var _ = Describe("SubscriptionHandlers", Ordered, func() {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}

	var _ = Describe("CreateSubscriptionHandler", Ordered, func() {
		It("returns 201 and the created subscription with auth policy", func() {
			subName := fmt.Sprintf("test-sub-%d", GinkgoRandomSeed())

			actual, rs, err := setupApiTest[Envelope[*models.CreateSubscriptionResponse, None]](
				http.MethodPost,
				"/api/v1/new-subscription",
				Envelope[models.CreateSubscriptionRequest, None]{
					Data: models.CreateSubscriptionRequest{
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
				},
				k8Factory,
				identity,
			)

			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusCreated))
			Expect(actual.Data.Subscription.Name).To(Equal(subName))
			Expect(actual.Data.Subscription.Namespace).To(Equal("maas-system"))
			Expect(actual.Data.Subscription.Priority).To(Equal(int32(10)))
			Expect(actual.Data.Subscription.Owner.Groups).To(HaveLen(1))
			Expect(actual.Data.Subscription.Owner.Groups[0].Name).To(Equal("premium-users"))
			Expect(actual.Data.Subscription.ModelRefs).To(HaveLen(1))
			Expect(actual.Data.Subscription.ModelRefs[0].Name).To(Equal("granite-3-8b-instruct"))
			Expect(actual.Data.Subscription.ModelRefs[0].TokenRateLimits).To(HaveLen(1))
			Expect(actual.Data.Subscription.ModelRefs[0].TokenRateLimits[0].Limit).To(Equal(int64(100000)))
			Expect(actual.Data.Subscription.TokenMetadata).NotTo(BeNil())
			Expect(actual.Data.Subscription.TokenMetadata.OrganizationID).To(Equal("org-123"))

			// Auth policy should also be created
			Expect(actual.Data.AuthPolicy).NotTo(BeNil())
			Expect(actual.Data.AuthPolicy.Name).To(Equal(subName + "-policy"))
			Expect(actual.Data.AuthPolicy.Namespace).To(Equal("maas-system"))
			Expect(actual.Data.AuthPolicy.ModelRefs).To(HaveLen(1))
			Expect(actual.Data.AuthPolicy.ModelRefs[0].Name).To(Equal("granite-3-8b-instruct"))
			Expect(actual.Data.AuthPolicy.Subjects.Groups).To(HaveLen(1))
			Expect(actual.Data.AuthPolicy.Subjects.Groups[0].Name).To(Equal("premium-users"))
		})

		It("returns 409 when subscription already exists", func() {
			subName := fmt.Sprintf("dup-sub-%d", GinkgoRandomSeed())

			// Create first
			_, rs1, err := setupApiTest[Envelope[*models.CreateSubscriptionResponse, None]](
				http.MethodPost,
				"/api/v1/new-subscription",
				Envelope[models.CreateSubscriptionRequest, None]{
					Data: models.CreateSubscriptionRequest{
						Name: subName,
						Owner: models.OwnerSpec{
							Groups: []models.GroupReference{{Name: "users"}},
						},
						ModelRefs: []models.ModelSubscriptionRef{
							{Name: "granite-3-8b-instruct", Namespace: "maas-models", TokenRateLimits: []models.TokenRateLimit{{Limit: 1000, Window: "1h"}}},
						},
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
				Envelope[models.CreateSubscriptionRequest, None]{
					Data: models.CreateSubscriptionRequest{
						Name: subName,
						Owner: models.OwnerSpec{
							Groups: []models.GroupReference{{Name: "users"}},
						},
						ModelRefs: []models.ModelSubscriptionRef{
							{Name: "granite-3-8b-instruct", Namespace: "maas-models", TokenRateLimits: []models.TokenRateLimit{{Limit: 1000, Window: "1h"}}},
						},
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
				Envelope[models.CreateSubscriptionRequest, None]{
					Data: models.CreateSubscriptionRequest{
						Name: "",
						ModelRefs: []models.ModelSubscriptionRef{
							{Name: "granite-3-8b-instruct", Namespace: "maas-models"},
						},
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
				Envelope[models.CreateSubscriptionRequest, None]{
					Data: models.CreateSubscriptionRequest{
						Name:      "no-models-sub",
						ModelRefs: []models.ModelSubscriptionRef{},
					},
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
			_, rs, err := setupApiTest[Envelope[*models.CreateSubscriptionResponse, None]](
				http.MethodPost,
				"/api/v1/new-subscription",
				Envelope[models.CreateSubscriptionRequest, None]{
					Data: models.CreateSubscriptionRequest{
						Name: "list-test-sub",
						Owner: models.OwnerSpec{
							Groups: []models.GroupReference{{Name: "users"}},
						},
						ModelRefs: []models.ModelSubscriptionRef{
							{Name: "granite-3-8b-instruct", Namespace: "maas-models", TokenRateLimits: []models.TokenRateLimit{{Limit: 1000, Window: "1h"}}},
						},
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
			_, rs, err := setupApiTest[Envelope[*models.CreateSubscriptionResponse, None]](
				http.MethodPost,
				"/api/v1/new-subscription",
				Envelope[models.CreateSubscriptionRequest, None]{
					Data: models.CreateSubscriptionRequest{
						Name: "info-test-sub",
						Owner: models.OwnerSpec{
							Groups: []models.GroupReference{{Name: "premium-users"}},
						},
						ModelRefs: []models.ModelSubscriptionRef{
							{Name: "granite-3-8b-instruct", Namespace: "maas-models", TokenRateLimits: []models.TokenRateLimit{{Limit: 1000, Window: "1h"}}},
						},
						TokenMetadata: &models.TokenMetadata{
							OrganizationID: "org-456",
						},
						Priority: 5,
					},
				},
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusCreated))
		})

		It("returns 200 with subscription info, model refs, and auth policies", func() {
			actual, rs, err := setupApiTest[Envelope[models.SubscriptionInfoResponse, None]](
				http.MethodGet,
				"/api/v1/subscription-info/info-test-sub",
				nil,
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusOK))
			Expect(actual.Data.Subscription.Name).To(Equal("info-test-sub"))
			Expect(actual.Data.Subscription.Namespace).To(Equal("maas-system"))
			Expect(actual.Data.Subscription.Priority).To(Equal(int32(5)))
			Expect(actual.Data.Subscription.TokenMetadata).NotTo(BeNil())
			Expect(actual.Data.Subscription.TokenMetadata.OrganizationID).To(Equal("org-456"))
			Expect(actual.Data.Subscription.DisplayName).To(BeAssignableToTypeOf(""))
			Expect(actual.Data.Subscription.Description).To(BeAssignableToTypeOf(""))
			Expect(actual.Data.ModelRefs).To(HaveLen(1))
			Expect(actual.Data.ModelRefs[0].Name).To(Equal("granite-3-8b-instruct"))
			Expect(actual.Data.ModelRefs[0].DisplayName).To(BeAssignableToTypeOf(""))
			Expect(actual.Data.ModelRefs[0].Description).To(BeAssignableToTypeOf(""))

			// Auth policies may be empty if not created with the subscription
			Expect(actual.Data.AuthPolicies).NotTo(BeNil())
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

	var _ = Describe("GetSubscriptionPolicyFormDataHandler", Ordered, func() {
		It("returns 200 with groups and model refs", func() {
			envelope, rs, err := setupApiTest[Envelope[models.SubscriptionFormDataResponse, None]](
				http.MethodGet,
				"/api/v1/subscription-policy-form-data",
				nil,
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusOK))
			actual := envelope.Data

			// Should have at least the model refs seeded in test env
			Expect(len(actual.ModelRefs)).To(BeNumerically(">=", 2))
			var names []string
			for _, ref := range actual.ModelRefs {
				names = append(names, ref.Name)
			}
			Expect(names).To(ContainElements("granite-3-8b-instruct", "flan-t5-small"))

			// Groups fallback to system:authenticated since envtest doesn't have user.openshift.io
			Expect(actual.Groups).To(ContainElement("system:authenticated"))

			// Should include all existing subscriptions on the cluster
			Expect(actual.Subscriptions).NotTo(BeNil())
			Expect(len(actual.Subscriptions)).To(BeNumerically(">", 0))
		})
	})

	var _ = Describe("UpdateSubscriptionHandler", Ordered, func() {
		BeforeAll(func() {
			_, rs, err := setupApiTest[Envelope[*models.CreateSubscriptionResponse, None]](
				http.MethodPost,
				"/api/v1/new-subscription",
				Envelope[models.CreateSubscriptionRequest, None]{
					Data: models.CreateSubscriptionRequest{
						Name: "update-test-sub",
						Owner: models.OwnerSpec{
							Groups: []models.GroupReference{{Name: "users"}},
						},
						ModelRefs: []models.ModelSubscriptionRef{
							{Name: "granite-3-8b-instruct", Namespace: "maas-models", TokenRateLimits: []models.TokenRateLimit{{Limit: 1000, Window: "1h"}}},
						},
						Priority: 1,
					},
				},
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusCreated))
		})

		It("returns 200 and the updated subscription", func() {
			actual, rs, err := setupApiTest[Envelope[*models.CreateSubscriptionResponse, None]](
				http.MethodPut,
				"/api/v1/update-subscription/update-test-sub",
				Envelope[models.UpdateSubscriptionRequest, None]{
					Data: models.UpdateSubscriptionRequest{
						Owner: models.OwnerSpec{
							Groups: []models.GroupReference{{Name: "premium-users"}},
						},
						ModelRefs: []models.ModelSubscriptionRef{
							{Name: "granite-3-8b-instruct", Namespace: "maas-models", TokenRateLimits: []models.TokenRateLimit{{Limit: 2000, Window: "1h"}}},
							{Name: "flan-t5-small", Namespace: "maas-models", TokenRateLimits: []models.TokenRateLimit{{Limit: 500, Window: "1m"}}},
						},
						TokenMetadata: &models.TokenMetadata{
							OrganizationID: "updated-org",
						},
						Priority: 20,
					},
				},
				k8Factory,
				identity,
			)

			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusOK))
			Expect(actual.Data.Subscription.Name).To(Equal("update-test-sub"))
			Expect(actual.Data.Subscription.Priority).To(Equal(int32(20)))
			Expect(actual.Data.Subscription.Owner.Groups).To(HaveLen(1))
			Expect(actual.Data.Subscription.Owner.Groups[0].Name).To(Equal("premium-users"))
			Expect(actual.Data.Subscription.ModelRefs).To(HaveLen(2))
			Expect(actual.Data.Subscription.TokenMetadata).NotTo(BeNil())
			Expect(actual.Data.Subscription.TokenMetadata.OrganizationID).To(Equal("updated-org"))

			// Auth policy is not managed during update
			Expect(actual.Data.AuthPolicy).To(BeNil())
		})

		It("returns 404 for non-existent subscription", func() {
			_, rs, err := setupApiTest[map[string]interface{}](
				http.MethodPut,
				"/api/v1/update-subscription/non-existent-sub",
				Envelope[models.UpdateSubscriptionRequest, None]{
					Data: models.UpdateSubscriptionRequest{
						Owner: models.OwnerSpec{
							Groups: []models.GroupReference{{Name: "users"}},
						},
						ModelRefs: []models.ModelSubscriptionRef{
							{Name: "granite-3-8b-instruct", Namespace: "maas-models", TokenRateLimits: []models.TokenRateLimit{{Limit: 1000, Window: "1h"}}},
						},
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
				Envelope[models.UpdateSubscriptionRequest, None]{
					Data: models.UpdateSubscriptionRequest{
						Owner: models.OwnerSpec{
							Groups: []models.GroupReference{{Name: "users"}},
						},
						ModelRefs: []models.ModelSubscriptionRef{},
					},
				},
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusBadRequest))
		})

		It("preserves spec.owner.users set outside the UI when updating via the API", func() {
			subName := fmt.Sprintf("preserve-users-sub-%d", GinkgoRandomSeed())

			// Create a subscription via the API (groups only — as the UI does)
			_, rs, err := setupApiTest[Envelope[*models.CreateSubscriptionResponse, None]](
				http.MethodPost,
				"/api/v1/new-subscription",
				Envelope[models.CreateSubscriptionRequest, None]{
					Data: models.CreateSubscriptionRequest{
						Name: subName,
						Owner: models.OwnerSpec{
							Groups: []models.GroupReference{{Name: "users"}},
						},
						ModelRefs: []models.ModelSubscriptionRef{
							{Name: "granite-3-8b-instruct", Namespace: "maas-models", TokenRateLimits: []models.TokenRateLimit{{Limit: 1000, Window: "1h"}}},
						},
					},
				},
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusCreated))

			// Directly inject spec.owner.users into the live K8s object (simulating a YAML apply)
			ctx := context.Background()
			existing, err := dynamicClient.Resource(constants.MaaSSubscriptionGvr).Namespace("maas-system").Get(ctx, subName, metav1.GetOptions{})
			Expect(err).NotTo(HaveOccurred())

			owner, _, _ := unstructured.NestedMap(existing.Object, "spec", "owner")
			if owner == nil {
				owner = map[string]interface{}{}
			}
			owner["users"] = []interface{}{
				map[string]interface{}{"name": "injected-user"},
			}
			Expect(unstructured.SetNestedMap(existing.Object, owner, "spec", "owner")).To(Succeed())
			_, err = dynamicClient.Resource(constants.MaaSSubscriptionGvr).Namespace("maas-system").Update(ctx, existing, metav1.UpdateOptions{})
			Expect(err).NotTo(HaveOccurred())

			// Update via the API (groups only — simulating a normal UI save)
			_, rs, err = setupApiTest[Envelope[*models.CreateSubscriptionResponse, None]](
				http.MethodPut,
				"/api/v1/update-subscription/"+subName,
				Envelope[models.UpdateSubscriptionRequest, None]{
					Data: models.UpdateSubscriptionRequest{
						Owner: models.OwnerSpec{
							Groups: []models.GroupReference{{Name: "premium-users"}},
						},
						ModelRefs: []models.ModelSubscriptionRef{
							{Name: "granite-3-8b-instruct", Namespace: "maas-models", TokenRateLimits: []models.TokenRateLimit{{Limit: 2000, Window: "1h"}}},
						},
					},
				},
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusOK))

			// Read the raw K8s object and verify spec.owner.users was not removed
			updated, err := dynamicClient.Resource(constants.MaaSSubscriptionGvr).Namespace("maas-system").Get(ctx, subName, metav1.GetOptions{})
			Expect(err).NotTo(HaveOccurred())

			users, found, err := unstructured.NestedSlice(updated.Object, "spec", "owner", "users")
			Expect(err).NotTo(HaveOccurred())
			Expect(found).To(BeTrue(), "spec.owner.users should still be present after UI update")
			Expect(users).To(HaveLen(1))
			if userMap, ok := users[0].(map[string]interface{}); ok {
				Expect(userMap["name"]).To(Equal("injected-user"))
			}
		})
	})

	var _ = Describe("DeleteSubscriptionHandler", Ordered, func() {
		BeforeAll(func() {
			_, rs, err := setupApiTest[Envelope[*models.CreateSubscriptionResponse, None]](
				http.MethodPost,
				"/api/v1/new-subscription",
				Envelope[models.CreateSubscriptionRequest, None]{
					Data: models.CreateSubscriptionRequest{
						Name: "delete-test-sub",
						Owner: models.OwnerSpec{
							Groups: []models.GroupReference{{Name: "users"}},
						},
						ModelRefs: []models.ModelSubscriptionRef{
							{Name: "granite-3-8b-instruct", Namespace: "maas-models", TokenRateLimits: []models.TokenRateLimit{{Limit: 1000, Window: "1h"}}},
						},
					},
				},
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusCreated))
		})

		It("returns 200 and deletes the subscription", func() {
			_, rs, err := setupApiTest[Envelope[None, None]](
				http.MethodDelete,
				"/api/v1/subscription/delete-test-sub",
				nil,
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusOK))

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
