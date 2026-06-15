package api

import (
	"fmt"
	"net/http"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"

	"github.com/opendatahub-io/maas-library/bff/internal/constants"
	"github.com/opendatahub-io/maas-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

var _ = Describe("ModelsOverviewHandler", Ordered, func() {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}

	// Use seed-based unique names so resources don't collide with other test suites
	// running against the same envtest instance.
	var (
		modelName  string
		subName    string
		policyName string
	)

	BeforeAll(func() {
		seed := GinkgoRandomSeed()
		modelName = fmt.Sprintf("overview-model-%d", seed)
		subName = fmt.Sprintf("overview-sub-%d", seed)
		policyName = fmt.Sprintf("overview-policy-%d", seed)

		// Create MaaSModelRef
		_, rs, err := setupApiTest[Envelope[*models.MaaSModelRefSummary, None]](
			http.MethodPost,
			constants.MaaSModelRefCreatePath,
			Envelope[models.CreateMaaSModelRefRequest, None]{
				Data: models.CreateMaaSModelRefRequest{
					Name:        modelName,
					Namespace:   "maas-models",
					DisplayName: "Granite 3 8B Instruct",
					Description: "IBM Granite 3 8B instruction-tuned language model.",
					ModelRef: models.ModelReference{
						Kind: "LLMInferenceService",
						Name: modelName,
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
					Name:        subName,
					DisplayName: "Premium Team Subscription",
					Owner: models.OwnerSpec{
						Groups: []models.GroupReference{
							{Name: "premium-users"},
						},
					},
					ModelRefs: []models.ModelSubscriptionRef{
						{
							Name:      modelName,
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
					Name:        policyName,
					DisplayName: "Premium Team Policy",
					ModelRefs: []models.ModelRef{
						{Name: modelName, Namespace: "maas-models"},
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

	// findModel locates a specific item in the overview response by model ID.
	findModel := func(items []models.ModelOverviewItem, id string) *models.ModelOverviewItem {
		for i := range items {
			if items[i].ID == id {
				return &items[i]
			}
		}
		return nil
	}

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

		item := findModel(actual.Data, modelName)
		Expect(item).NotTo(BeNil())
		Expect(item.ModelDetails.DisplayName).To(Equal("Granite 3 8B Instruct"))
		Expect(item.ModelDetails.Description).To(Equal("IBM Granite 3 8B instruction-tuned language model."))
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

		item := findModel(actual.Data, modelName)
		Expect(item).NotTo(BeNil())
		Expect(item.Subscriptions).To(HaveLen(1))
		sub := item.Subscriptions[0]
		Expect(sub.Name).To(Equal(subName))
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

		item := findModel(actual.Data, modelName)
		Expect(item).NotTo(BeNil())
		Expect(item.AuthPolicies).To(HaveLen(1))
		policy := item.AuthPolicies[0]
		Expect(policy.Name).To(Equal(policyName))
		Expect(policy.DisplayName).To(Equal("Premium Team Policy"))
		Expect(policy.Groups).To(ConsistOf("premium-users"))
	})

	It("returns empty subscriptions and policies for a model with none", func() {
		standaloneModel := fmt.Sprintf("standalone-model-%d", GinkgoRandomSeed())

		_, rs, err := setupApiTest[Envelope[*models.MaaSModelRefSummary, None]](
			http.MethodPost,
			constants.MaaSModelRefCreatePath,
			Envelope[models.CreateMaaSModelRefRequest, None]{
				Data: models.CreateMaaSModelRefRequest{
					Name:        standaloneModel,
					Namespace:   "maas-models",
					DisplayName: "Standalone Model",
					ModelRef: models.ModelReference{
						Kind: "LLMInferenceService",
						Name: standaloneModel,
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

		item := findModel(actual.Data, standaloneModel)
		Expect(item).NotTo(BeNil())
		Expect(item.Subscriptions).To(BeEmpty())
		Expect(item.AuthPolicies).To(BeEmpty())
	})
})
