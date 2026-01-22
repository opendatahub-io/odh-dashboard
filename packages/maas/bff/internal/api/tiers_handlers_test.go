package api

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/maas-library/bff/internal/config"
	"github.com/opendatahub-io/maas-library/bff/internal/constants"
	"github.com/opendatahub-io/maas-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
	"github.com/opendatahub-io/maas-library/bff/internal/repositories"
)

var _ = Describe("TiersHandlers", Ordered, func() {

	var _ = Describe("GetTiersListHandler", Ordered, func() {
		It("Returns 200 and a list of tiers", func() {
			identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}

			actual, rs, err := setupApiTest[Envelope[models.TiersList, None]](
				http.MethodGet,
				"/api/v1/tiers",
				nil,
				k8Factory,
				identity,
			)

			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusOK))
			Expect(actual.Data).NotTo(BeNil())
			Expect(len(actual.Data)).Should(BeNumerically(">", 0))
			Expect(actual.Data).To(ContainElements(
				HaveField("Name", "tier0"),
				HaveField("Name", "tier1"),
			))
		})
		It("Returns 400 if user ID is missing", func() {
			identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
			identity.UserID = "" //No user ID to force an error

			actual, rs, err := setupApiTest[Envelope[models.TiersList, None]](
				http.MethodGet,
				"/api/v1/tiers",
				nil,
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusBadRequest))
			Expect(actual.Data).To(BeNil())
		})
		It("returns 500 when tiers ConfigMap is missing", func() {
			badCfg := config.EnvConfig{
				AuthMethod:              config.AuthMethodInternal,
				AllowedOrigins:          []string{"*"},
				TiersConfigMapNamespace: "does-not-exist",
				TiersConfigMapName:      "missing-configmap",
				GatewayNamespace:        "openshift-ingress",
				GatewayName:             "maas-default-gateway",
			}

			app := &App{
				config:                  badCfg,
				kubernetesClientFactory: k8Factory,
				repositories:            repositories.NewRepositories(nil, k8Factory, badCfg),
				logger:                  slog.New(slog.NewTextHandler(io.Discard, nil)),
			}

			req := httptest.NewRequest(http.MethodGet, "/api/v1/tiers", nil)
			req.Header.Set(constants.KubeflowUserIDHeader, "user@example.com") // pass auth
			ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &kubernetes.RequestIdentity{UserID: "user@example.com"})
			req = req.WithContext(ctx)

			rr := httptest.NewRecorder()
			app.Routes().ServeHTTP(rr, req)

			Expect(rr.Code).To(Equal(http.StatusInternalServerError))
		})
	})

	var _ = Describe("GetTierHandler", Ordered, func() {
		It("returns 200 and the tier", func() {
			identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}

			actual, rs, err := setupApiTest[Envelope[*models.Tier, None]](
				http.MethodGet,
				"/api/v1/tier/tier0",
				nil,
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusOK))
			Expect(actual.Data.Name).To(Equal("tier0"))
		})

		It("returns 404 if tier does not exist", func() {
			identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}

			actual, rs, err := setupApiTest[Envelope[*models.Tier, None]](
				http.MethodGet,
				"/api/v1/tier/missing",
				nil,
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusNotFound))
			Expect(actual.Data).To(BeNil())
		})

		It("returns 400 if tier name is not provided", func() {
			identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
			req := httptest.NewRequest(http.MethodGet, "/api/v1/tier/", nil)

			ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
			req = req.WithContext(ctx)

			rr := httptest.NewRecorder()
			params := httprouter.Params{httprouter.Param{Key: "name", Value: ""}}

			GetTierHandler(nil, rr, req, params)

			Expect(rr.Code).To(Equal(http.StatusBadRequest))
		})
	})

	var _ = Describe("CreateTierHandler", Ordered, func() {
		It("returns 201 and the created tier", func() {
			identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
			tierName := fmt.Sprintf("create-tier-%d", GinkgoRandomSeed())

			actual, rs, err := setupApiTest[Envelope[*models.Tier, None]](
				http.MethodPost,
				"/api/v1/tier",
				Envelope[models.Tier, None]{
					Data: models.Tier{
						Name:        tierName,
						DisplayName: "Create Tier",
						Description: "Create tier description",
						Level:       10,
						Groups:      []string{"group1"},
						Limits: models.TierLimits{
							TokensPerUnit: []models.RateLimit{
								{Count: 100, Time: 1, Unit: models.GEP_2257_HOUR},
							},
							RequestsPerUnit: []models.RateLimit{
								{Count: 100, Time: 1, Unit: models.GEP_2257_SECOND},
							},
						},
					},
				},
				k8Factory,
				identity,
			)
			if rs.StatusCode >= 400 {
				fmt.Fprintf(GinkgoWriter, "ERROR RESPONSE: %+v\n", actual)
			}

			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusCreated))
			Expect(actual.Data.Name).To(Equal(tierName))
			Expect(actual.Data.DisplayName).To(Equal("Create Tier"))
			Expect(actual.Data.Description).To(Equal("Create tier description"))
			Expect(actual.Data.Level).To(Equal(10))
			Expect(actual.Data.Groups).To(Equal([]string{"group1"}))
			Expect(actual.Data.Limits.TokensPerUnit).To(Equal([]models.RateLimit{{Count: 100, Time: 1, Unit: models.GEP_2257_HOUR}}))
			Expect(actual.Data.Limits.RequestsPerUnit).To(Equal([]models.RateLimit{{Count: 100, Time: 1, Unit: models.GEP_2257_SECOND}}))
		})
		It("returns an error if the tier already exists", func() {
			identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}

			actual, rs, err := setupApiTest[Envelope[*models.Tier, None]](
				http.MethodPost,
				"/api/v1/tier",
				Envelope[models.Tier, None]{
					Data: models.Tier{
						Name:        "tier0",
						DisplayName: "Tier 0",
						Description: "Tier 0 description",
						Level:       1,
						Groups:      []string{"group1"},
						Limits: models.TierLimits{
							TokensPerUnit:   []models.RateLimit{{Count: 100, Time: 1, Unit: models.GEP_2257_HOUR}},
							RequestsPerUnit: []models.RateLimit{{Count: 100, Time: 1, Unit: models.GEP_2257_SECOND}},
						},
					},
				},
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusUnprocessableEntity))
			Expect(actual.Data).To(BeNil())
		})
		It("returns a bad request error if the request is invalid", func() {
			identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
			req := httptest.NewRequest(http.MethodPost, "/api/v1/tier/", nil)

			ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
			req = req.WithContext(ctx)

			rr := httptest.NewRecorder()

			CreateTierHandler(nil, rr, req, httprouter.Params{}) //empty params to force a bad request

			Expect(rr.Code).To(Equal(http.StatusBadRequest))
		})
	})

	var _ = Describe("UpdateTierHandler", Ordered, func() {
		It("returns 200 and the updated tier", func() {
			identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}

			actual, rs, err := setupApiTest[Envelope[*models.Tier, None]](
				http.MethodPut,
				fmt.Sprintf("/api/v1/tier/%s", "tier0"),
				Envelope[models.Tier, None]{
					Data: models.Tier{
						Name:        "tier0",
						DisplayName: "Tier 0 Updated",
						Description: "Tier 0 description Updated",
						Level:       1,
						Groups:      []string{"group1", "group2"},
						Limits: models.TierLimits{
							TokensPerUnit:   []models.RateLimit{{Count: 200, Time: 1, Unit: models.GEP_2257_HOUR}},
							RequestsPerUnit: []models.RateLimit{{Count: 200, Time: 1, Unit: models.GEP_2257_SECOND}},
						},
					},
				},
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusOK))
			Expect(actual.Data.Name).To(Equal("tier0"))
			Expect(actual.Data.DisplayName).To(Equal("Tier 0 Updated"))
			Expect(actual.Data.Description).To(Equal("Tier 0 description Updated"))
			Expect(actual.Data.Level).To(Equal(1))
			Expect(actual.Data.Groups).To(Equal([]string{"group1", "group2"}))
			Expect(actual.Data.Limits.TokensPerUnit).To(Equal([]models.RateLimit{{Count: 200, Time: 1, Unit: models.GEP_2257_HOUR}}))
			Expect(actual.Data.Limits.RequestsPerUnit).To(Equal([]models.RateLimit{{Count: 200, Time: 1, Unit: models.GEP_2257_SECOND}}))
		})
		It("returns 404 if the tier doesn't exist", func() {
			identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}

			actual, rs, err := setupApiTest[Envelope[*models.Tier, None]](
				http.MethodPut,
				fmt.Sprintf("/api/v1/tier/%s", "fake-tier"),
				Envelope[models.Tier, None]{
					Data: models.Tier{
						Name:        "fake-tier",
						DisplayName: "Fake Tier",
						Description: "Fake tier description",
						Level:       1,
						Groups:      []string{"group1"},
						Limits: models.TierLimits{
							TokensPerUnit:   []models.RateLimit{{Count: 100, Time: 1, Unit: models.GEP_2257_HOUR}},
							RequestsPerUnit: []models.RateLimit{{Count: 100, Time: 1, Unit: models.GEP_2257_SECOND}},
						},
					},
				},
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusNotFound))
			Expect(actual.Data).To(BeNil())
		})

		It("returns 400 if the tier name is not provided", func() {
			identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
			req := httptest.NewRequest(http.MethodPut, "/api/v1/tier/", nil)

			ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
			req = req.WithContext(ctx)

			rr := httptest.NewRecorder()

			UpdateTierHandler(nil, rr, req, httprouter.Params{}) //empty params to force a bad request

			Expect(rr.Code).To(Equal(http.StatusBadRequest))
		})

		It("returns a bad request error if the request is invalid", func() {
			identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
			req := httptest.NewRequest(http.MethodPut, "/api/v1/tier/tier0", nil)

			ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
			req = req.WithContext(ctx)

			rr := httptest.NewRecorder()

			UpdateTierHandler(nil, rr, req, httprouter.Params{}) //empty params to force a bad request

			Expect(rr.Code).To(Equal(http.StatusBadRequest))
		})
	})

	var _ = Describe("DeleteTierHandler", Ordered, func() {
		It("returns 200 and a success message", func() {
			identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}

			actual, rs, err := setupApiTest[Envelope[None, None]](
				http.MethodDelete,
				"/api/v1/tier/tier0",
				nil,
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusOK))
			Expect(actual.Data).To(BeNil())
		})
		It("returns 404 if the tier doesn't exist", func() {
			identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}

			actual, rs, err := setupApiTest[Envelope[None, None]](
				http.MethodDelete,
				"/api/v1/tier/fake-tier",
				nil,
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusNotFound))
			Expect(actual.Data).To(BeNil())
		})
		It("returns 400 if the tier name is not provided", func() {
			identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
			req := httptest.NewRequest(http.MethodDelete, "/api/v1/tier/", nil)

			ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
			req = req.WithContext(ctx)

			rr := httptest.NewRecorder()
			params := httprouter.Params{httprouter.Param{Key: "name", Value: ""}}

			DeleteTierHandler(nil, rr, req, params)

			Expect(rr.Code).To(Equal(http.StatusBadRequest))
		})
		It("returns a bad request error if the request is invalid", func() {
			identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
			req := httptest.NewRequest(http.MethodDelete, "/api/v1/tier/", nil)

			ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
			req = req.WithContext(ctx)

			rr := httptest.NewRecorder()

			DeleteTierHandler(nil, rr, req, httprouter.Params{}) //empty params to force a bad request

			Expect(rr.Code).To(Equal(http.StatusBadRequest))
		})
	})
})
