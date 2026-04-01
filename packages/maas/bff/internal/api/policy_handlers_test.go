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

var _ = Describe("PolicyHandlers", Ordered, func() {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}

	var _ = Describe("CreatePolicyHandler", Ordered, func() {
		It("returns 201 and the created policy", func() {
			policyName := fmt.Sprintf("test-policy-%d", GinkgoRandomSeed())

			actual, rs, err := setupApiTest[models.MaaSAuthPolicy](
				http.MethodPost,
				"/api/v1/new-policy",
				models.CreatePolicyRequest{
					Name: policyName,
					ModelRefs: []models.ModelRef{
						{
							Name:      "granite-3-8b-instruct",
							Namespace: "maas-models",
						},
					},
					Subjects: models.SubjectSpec{
						Groups: []models.GroupReference{
							{Name: "premium-users"},
						},
					},
					MeteringMetadata: &models.TokenMetadata{
						OrganizationID: "org-123",
						CostCenter:     "engineering",
					},
				},
				k8Factory,
				identity,
			)

			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusCreated))
			Expect(actual.Name).To(Equal(policyName))
			Expect(actual.Namespace).To(Equal("maas-system"))
			Expect(actual.ModelRefs).To(HaveLen(1))
			Expect(actual.ModelRefs[0].Name).To(Equal("granite-3-8b-instruct"))
			Expect(actual.Subjects.Groups).To(HaveLen(1))
			Expect(actual.Subjects.Groups[0].Name).To(Equal("premium-users"))
			Expect(actual.MeteringMetadata).NotTo(BeNil())
			Expect(actual.MeteringMetadata.OrganizationID).To(Equal("org-123"))
		})

		It("returns 409 when policy already exists", func() {
			policyName := fmt.Sprintf("dup-policy-%d", GinkgoRandomSeed())

			// Create first
			_, rs1, err := setupApiTest[models.MaaSAuthPolicy](
				http.MethodPost,
				"/api/v1/new-policy",
				models.CreatePolicyRequest{
					Name: policyName,
					ModelRefs: []models.ModelRef{
						{Name: "granite-3-8b-instruct", Namespace: "maas-models"},
					},
					Subjects: models.SubjectSpec{
						Groups: []models.GroupReference{{Name: "users"}},
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
				"/api/v1/new-policy",
				models.CreatePolicyRequest{
					Name: policyName,
					ModelRefs: []models.ModelRef{
						{Name: "granite-3-8b-instruct", Namespace: "maas-models"},
					},
					Subjects: models.SubjectSpec{
						Groups: []models.GroupReference{{Name: "users"}},
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
				"/api/v1/new-policy",
				models.CreatePolicyRequest{
					Name: "",
					ModelRefs: []models.ModelRef{
						{Name: "granite-3-8b-instruct", Namespace: "maas-models"},
					},
					Subjects: models.SubjectSpec{
						Groups: []models.GroupReference{{Name: "users"}},
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
				"/api/v1/new-policy",
				models.CreatePolicyRequest{
					Name:      "no-models-policy",
					ModelRefs: []models.ModelRef{},
					Subjects: models.SubjectSpec{
						Groups: []models.GroupReference{{Name: "users"}},
					},
				},
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusBadRequest))
		})
	})

	var _ = Describe("ListPoliciesHandler", Ordered, func() {
		BeforeAll(func() {
			// Seed a policy for listing
			_, rs, err := setupApiTest[models.MaaSAuthPolicy](
				http.MethodPost,
				"/api/v1/new-policy",
				models.CreatePolicyRequest{
					Name: "list-test-policy",
					ModelRefs: []models.ModelRef{
						{Name: "granite-3-8b-instruct", Namespace: "maas-models"},
					},
					Subjects: models.SubjectSpec{
						Groups: []models.GroupReference{{Name: "users"}},
					},
				},
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusCreated))
		})

		It("returns 200 and a list of policies", func() {
			actual, rs, err := setupApiTest[Envelope[[]models.MaaSAuthPolicy, None]](
				http.MethodGet,
				"/api/v1/all-policies",
				nil,
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusOK))
			Expect(actual.Data).NotTo(BeNil())
			Expect(len(actual.Data)).Should(BeNumerically(">", 0))

			// Find our seeded policy
			found := false
			for _, policy := range actual.Data {
				if policy.Name == "list-test-policy" {
					found = true
					Expect(policy.Namespace).To(Equal("maas-system"))
					break
				}
			}
			Expect(found).To(BeTrue(), "list-test-policy should be in the list")
		})
	})

	var _ = Describe("GetPolicyInfoHandler", Ordered, func() {
		BeforeAll(func() {
			_, rs, err := setupApiTest[models.MaaSAuthPolicy](
				http.MethodPost,
				"/api/v1/new-policy",
				models.CreatePolicyRequest{
					Name: "info-test-policy",
					ModelRefs: []models.ModelRef{
						{Name: "granite-3-8b-instruct", Namespace: "maas-models"},
						{Name: "flan-t5-small", Namespace: "maas-models"},
					},
					Subjects: models.SubjectSpec{
						Groups: []models.GroupReference{{Name: "premium-users"}},
					},
					MeteringMetadata: &models.TokenMetadata{
						OrganizationID: "org-456",
						CostCenter:     "ml-team",
					},
				},
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusCreated))
		})

		It("returns 200 with policy info and resolved model refs", func() {
			actual, rs, err := setupApiTest[models.PolicyInfoResponse](
				http.MethodGet,
				"/api/v1/view-policy/info-test-policy",
				nil,
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusOK))
			Expect(actual.Policy.Name).To(Equal("info-test-policy"))
			Expect(actual.Policy.Namespace).To(Equal("maas-system"))
			Expect(actual.Policy.ModelRefs).To(HaveLen(2))
			Expect(actual.Policy.Subjects.Groups).To(HaveLen(1))
			Expect(actual.Policy.Subjects.Groups[0].Name).To(Equal("premium-users"))
			Expect(actual.Policy.MeteringMetadata).NotTo(BeNil())
			Expect(actual.Policy.MeteringMetadata.OrganizationID).To(Equal("org-456"))

			// Model ref summaries should be resolved
			Expect(actual.ModelRefs).To(HaveLen(2))
			var names []string
			for _, ref := range actual.ModelRefs {
				names = append(names, ref.Name)
			}
			Expect(names).To(ContainElements("granite-3-8b-instruct", "flan-t5-small"))
		})

		It("returns 404 for non-existent policy", func() {
			_, rs, err := setupApiTest[map[string]interface{}](
				http.MethodGet,
				"/api/v1/view-policy/non-existent-policy",
				nil,
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusNotFound))
		})

		It("returns 400 when name is empty", func() {
			req := httptest.NewRequest(http.MethodGet, "/api/v1/view-policy/", nil)
			rr := httptest.NewRecorder()
			params := httprouter.Params{httprouter.Param{Key: "name", Value: ""}}
			GetPolicyInfoHandler(nil, rr, req, params)
			Expect(rr.Code).To(Equal(http.StatusBadRequest))
		})
	})

	var _ = Describe("GetSubscriptionFormDataHandler (with policies)", Ordered, func() {
		BeforeAll(func() {
			// Seed a policy to ensure it appears in form data
			_, rs, err := setupApiTest[models.MaaSAuthPolicy](
				http.MethodPost,
				"/api/v1/new-policy",
				models.CreatePolicyRequest{
					Name: "formdata-test-policy",
					ModelRefs: []models.ModelRef{
						{Name: "granite-3-8b-instruct", Namespace: "maas-models"},
					},
					Subjects: models.SubjectSpec{
						Groups: []models.GroupReference{{Name: "users"}},
					},
				},
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusCreated))
		})

		It("returns 200 with groups, model refs, policies, and subscriptions", func() {
			actual, rs, err := setupApiTest[models.SubscriptionFormDataResponse](
				http.MethodGet,
				"/api/v1/subscription-policy-form-data",
				nil,
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusOK))

			// Model refs
			Expect(len(actual.ModelRefs)).To(BeNumerically(">=", 2))
			var modelNames []string
			for _, ref := range actual.ModelRefs {
				modelNames = append(modelNames, ref.Name)
			}
			Expect(modelNames).To(ContainElements("granite-3-8b-instruct", "flan-t5-small"))

			// Groups
			Expect(actual.Groups).To(ContainElement("system:authenticated"))

			// Policies (NEW - should include our seeded policy)
			Expect(actual.Policies).NotTo(BeNil())
			Expect(len(actual.Policies)).To(BeNumerically(">", 0))
			var policyNames []string
			for _, policy := range actual.Policies {
				policyNames = append(policyNames, policy.Name)
			}
			Expect(policyNames).To(ContainElement("formdata-test-policy"))

			// Subscriptions (NEW - should be included for priority feature)
			Expect(actual.Subscriptions).NotTo(BeNil())
		})
	})

	var _ = Describe("UpdatePolicyHandler", Ordered, func() {
		BeforeAll(func() {
			_, rs, err := setupApiTest[models.MaaSAuthPolicy](
				http.MethodPost,
				"/api/v1/new-policy",
				models.CreatePolicyRequest{
					Name: "update-test-policy",
					ModelRefs: []models.ModelRef{
						{Name: "granite-3-8b-instruct", Namespace: "maas-models"},
					},
					Subjects: models.SubjectSpec{
						Groups: []models.GroupReference{{Name: "users"}},
					},
					MeteringMetadata: &models.TokenMetadata{
						OrganizationID: "org-old",
					},
				},
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusCreated))
		})

		It("returns 200 and the updated policy", func() {
			actual, rs, err := setupApiTest[models.MaaSAuthPolicy](
				http.MethodPut,
				"/api/v1/update-policy/update-test-policy",
				models.UpdatePolicyRequest{
					ModelRefs: []models.ModelRef{
						{Name: "granite-3-8b-instruct", Namespace: "maas-models"},
						{Name: "flan-t5-small", Namespace: "maas-models"},
					},
					Subjects: models.SubjectSpec{
						Groups: []models.GroupReference{{Name: "premium-users"}},
					},
					MeteringMetadata: &models.TokenMetadata{
						OrganizationID: "org-updated",
						CostCenter:     "updated-center",
					},
				},
				k8Factory,
				identity,
			)

			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusOK))
			Expect(actual.Name).To(Equal("update-test-policy"))
			Expect(actual.ModelRefs).To(HaveLen(2))
			Expect(actual.Subjects.Groups).To(HaveLen(1))
			Expect(actual.Subjects.Groups[0].Name).To(Equal("premium-users"))
			Expect(actual.MeteringMetadata).NotTo(BeNil())
			Expect(actual.MeteringMetadata.OrganizationID).To(Equal("org-updated"))
		})

		It("returns 404 for non-existent policy", func() {
			_, rs, err := setupApiTest[map[string]interface{}](
				http.MethodPut,
				"/api/v1/update-policy/non-existent-policy",
				models.UpdatePolicyRequest{
					ModelRefs: []models.ModelRef{
						{Name: "granite-3-8b-instruct", Namespace: "maas-models"},
					},
					Subjects: models.SubjectSpec{
						Groups: []models.GroupReference{{Name: "users"}},
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
				"/api/v1/update-policy/update-test-policy",
				models.UpdatePolicyRequest{
					ModelRefs: []models.ModelRef{},
					Subjects: models.SubjectSpec{
						Groups: []models.GroupReference{{Name: "users"}},
					},
				},
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusBadRequest))
		})
	})

	var _ = Describe("DeletePolicyHandler", Ordered, func() {
		BeforeAll(func() {
			_, rs, err := setupApiTest[models.MaaSAuthPolicy](
				http.MethodPost,
				"/api/v1/new-policy",
				models.CreatePolicyRequest{
					Name: "delete-test-policy",
					ModelRefs: []models.ModelRef{
						{Name: "granite-3-8b-instruct", Namespace: "maas-models"},
					},
					Subjects: models.SubjectSpec{
						Groups: []models.GroupReference{{Name: "users"}},
					},
				},
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusCreated))
		})

		It("returns 200 and deletes the policy", func() {
			actual, rs, err := setupApiTest[map[string]string](
				http.MethodDelete,
				"/api/v1/delete-policy/delete-test-policy",
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
				"/api/v1/view-policy/delete-test-policy",
				nil,
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs2.StatusCode).To(Equal(http.StatusNotFound))
		})

		It("returns 404 for non-existent policy", func() {
			_, rs, err := setupApiTest[map[string]interface{}](
				http.MethodDelete,
				"/api/v1/delete-policy/non-existent-policy",
				nil,
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusNotFound))
		})

		It("returns 400 when name is empty", func() {
			req := httptest.NewRequest(http.MethodDelete, "/api/v1/delete-policy/", nil)
			rr := httptest.NewRecorder()
			params := httprouter.Params{httprouter.Param{Key: "name", Value: ""}}
			DeletePolicyHandler(nil, rr, req, params)
			Expect(rr.Code).To(Equal(http.StatusBadRequest))
		})
	})

})
