package api

import (
	"net/http"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"

	"github.com/opendatahub-io/maas-library/bff/internal/constants"
	"github.com/opendatahub-io/maas-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

var _ = Describe("ModelsOverviewHandler", Ordered, func() {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}

	// Seed a MaaSModelRef, a subscription referencing it, and an auth policy referencing it
	// before running the overview assertions.
	BeforeAll(func() {
		// Create MaaSModelRef
		_, rs, err := setupApiTest[Envelope[*models.MaaSModelRefSummary, None]](
			http.MethodPost,
			constants.MaaSModelRefCreatePath,
			Envelope[models.CreateMaaSModelRefRequest, None]{
				Data: models.CreateMaaSModelRefRequest{
					Name:        "granite-3-8b-instruct",
					Namespace:   "maas-models",
					DisplayName: "Granite 3 8B Instruct",
					Description: "IBM Granite 3 8B instruction-tuned language model.",
					ModelRef: models.ModelReference{
						Kind: "LLMInferenceService",
						Name: "granite-3-8b-instruct",
					},
				},
			},
			k8Factory,
			identity,
		)
		Expect(err).NotTo(HaveOccurred())
		Expect(rs.StatusCode).To(Equal(http.StatusCreated))

		// Create subscription referencing the model
		_, rs, err = setupApiTest[Envelope[*models.CreateSubscriptionResponse, None]](
			http.MethodPost,
			constants.SubscriptionCreatePath,
			Envelope[models.CreateSubscriptionRequest, None]{
				Data: models.CreateSubscriptionRequest{
					Name:        "premium-team-sub",
					DisplayName: "Premium Team Subscription",
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
					Priority: 10,
				},
			},
			k8Factory,
			identity,
		)
		Expect(err).NotTo(HaveOccurred())
		Expect(rs.StatusCode).To(Equal(http.StatusCreated))

		// Create auth policy referencing the model
		_, rs, err = setupApiTest[Envelope[models.MaaSAuthPolicy, None]](
			http.MethodPost,
			constants.PolicyCreatePath,
			Envelope[models.CreatePolicyRequest, None]{
				Data: models.CreatePolicyRequest{
					Name:        "premium-team-policy",
					DisplayName: "Premium Team Policy",
					ModelRefs: []models.ModelRef{
						{Name: "granite-3-8b-instruct", Namespace: "maas-models"},
					},
					Subjects: models.SubjectSpec{
						Groups: []models.GroupReference{
							{Name: "premium-users"},
						},
					},
				},
			},
			k8Factory,
			identity,
		)
		Expect(err).NotTo(HaveOccurred())
		Expect(rs.StatusCode).To(Equal(http.StatusCreated))
	})

	It("returns 200 with a list of model overview items", func() {
		actual, rs, err := setupApiTest[Envelope[[]models.ModelOverviewItem, None]](
			http.MethodGet,
			constants.ModelsOverviewPath,
			nil,
			k8Factory,
			identity,
		)

		Expect(err).NotTo(HaveOccurred())
		Expect(rs.StatusCode).To(Equal(http.StatusOK))
		Expect(actual.Data).NotTo(BeEmpty())
	})

	It("includes the seeded model with correct details", func() {
		actual, rs, err := setupApiTest[Envelope[[]models.ModelOverviewItem, None]](
			http.MethodGet,
			constants.ModelsOverviewPath,
			nil,
			k8Factory,
			identity,
		)

		Expect(err).NotTo(HaveOccurred())
		Expect(rs.StatusCode).To(Equal(http.StatusOK))

		var granite *models.ModelOverviewItem
		for i := range actual.Data {
			if actual.Data[i].ID == "granite-3-8b-instruct" {
				granite = &actual.Data[i]
				break
			}
		}

		Expect(granite).NotTo(BeNil())
		Expect(granite.ModelDetails.DisplayName).To(Equal("Granite 3 8B Instruct"))
		Expect(granite.ModelDetails.Description).To(Equal("IBM Granite 3 8B instruction-tuned language model."))
	})

	It("includes the subscription with groups and rate limits", func() {
		actual, rs, err := setupApiTest[Envelope[[]models.ModelOverviewItem, None]](
			http.MethodGet,
			constants.ModelsOverviewPath,
			nil,
			k8Factory,
			identity,
		)

		Expect(err).NotTo(HaveOccurred())
		Expect(rs.StatusCode).To(Equal(http.StatusOK))

		var granite *models.ModelOverviewItem
		for i := range actual.Data {
			if actual.Data[i].ID == "granite-3-8b-instruct" {
				granite = &actual.Data[i]
				break
			}
		}

		Expect(granite).NotTo(BeNil())
		Expect(granite.Subscriptions).To(HaveLen(1))
		sub := granite.Subscriptions[0]
		Expect(sub.Name).To(Equal("premium-team-sub"))
		Expect(sub.DisplayName).To(Equal("Premium Team Subscription"))
		Expect(sub.Groups).To(ConsistOf("premium-users"))
		Expect(sub.TokenRateLimits).To(HaveLen(1))
		Expect(sub.TokenRateLimits[0].Limit).To(Equal(int64(100000)))
		Expect(sub.TokenRateLimits[0].Window).To(Equal("24h"))
	})

	It("includes the auth policy with groups", func() {
		actual, rs, err := setupApiTest[Envelope[[]models.ModelOverviewItem, None]](
			http.MethodGet,
			constants.ModelsOverviewPath,
			nil,
			k8Factory,
			identity,
		)

		Expect(err).NotTo(HaveOccurred())
		Expect(rs.StatusCode).To(Equal(http.StatusOK))

		var granite *models.ModelOverviewItem
		for i := range actual.Data {
			if actual.Data[i].ID == "granite-3-8b-instruct" {
				granite = &actual.Data[i]
				break
			}
		}

		Expect(granite).NotTo(BeNil())
		Expect(granite.AuthPolicies).To(HaveLen(1))
		policy := granite.AuthPolicies[0]
		Expect(policy.Name).To(Equal("premium-team-policy"))
		Expect(policy.DisplayName).To(Equal("Premium Team Policy"))
		Expect(policy.Groups).To(ConsistOf("premium-users"))
	})

	It("returns empty subscriptions and policies for a model with none", func() {
		// Create a model ref with no subscription or policy
		_, rs, err := setupApiTest[Envelope[*models.MaaSModelRefSummary, None]](
			http.MethodPost,
			constants.MaaSModelRefCreatePath,
			Envelope[models.CreateMaaSModelRefRequest, None]{
				Data: models.CreateMaaSModelRefRequest{
					Name:        "standalone-model",
					Namespace:   "maas-models",
					DisplayName: "Standalone Model",
					ModelRef: models.ModelReference{
						Kind: "LLMInferenceService",
						Name: "standalone-model",
					},
				},
			},
			k8Factory,
			identity,
		)
		Expect(err).NotTo(HaveOccurred())
		Expect(rs.StatusCode).To(Equal(http.StatusCreated))

		actual, rs, err := setupApiTest[Envelope[[]models.ModelOverviewItem, None]](
			http.MethodGet,
			constants.ModelsOverviewPath,
			nil,
			k8Factory,
			identity,
		)

		Expect(err).NotTo(HaveOccurred())
		Expect(rs.StatusCode).To(Equal(http.StatusOK))

		var standalone *models.ModelOverviewItem
		for i := range actual.Data {
			if actual.Data[i].ID == "standalone-model" {
				standalone = &actual.Data[i]
				break
			}
		}

		Expect(standalone).NotTo(BeNil())
		Expect(standalone.Subscriptions).To(BeEmpty())
		Expect(standalone.AuthPolicies).To(BeEmpty())
	})
})
