package api

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"

	"github.com/julienschmidt/httprouter"
	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"

	"github.com/opendatahub-io/maas-library/bff/internal/config"
	"github.com/opendatahub-io/maas-library/bff/internal/constants"
	"github.com/opendatahub-io/maas-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
	"github.com/opendatahub-io/maas-library/bff/internal/repositories"
)

var _ = Describe("APIKeysHandlers", Ordered, func() {
	var _ = Describe("SearchAPIKeysHandler", Ordered, func() {
		It("returns 200 and a paginated list of API keys", func() {
			identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
			searchRequest := models.APIKeySearchRequest{
				Filters: &models.APIKeySearchFilters{
					Status: []string{"active"},
				},
			}
			actual, rs, err := setupApiTest[Envelope[*models.APIKeyListResponse, None]](
				http.MethodPost,
				"/api/v1/api-keys/search",
				Envelope[models.APIKeySearchRequest, None]{
					Data: searchRequest,
				},
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusOK))
			Expect(actual.Data).NotTo(BeNil())
			Expect(actual.Data.Object).To(Equal("list"))
			Expect(len(actual.Data.Data)).Should(BeNumerically(">", 0))
		})
		It("returns subscription on API keys and enriches with subscription details from the MaaS API", func() {
			identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
			searchRequest := models.APIKeySearchRequest{}
			actual, rs, err := setupApiTest[Envelope[*models.APIKeyListResponse, None]](
				http.MethodPost,
				"/api/v1/api-keys/search",
				Envelope[models.APIKeySearchRequest, None]{
					Data: searchRequest,
				},
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusOK))
			Expect(actual.Data).NotTo(BeNil())

			hasSubscriptionName := false
			for _, key := range actual.Data.Data {
				if key.SubscriptionName != "" {
					hasSubscriptionName = true
					break
				}
			}
			Expect(hasSubscriptionName).To(BeTrue(), "mock data should include subscription on API keys")

			Expect(actual.Data.SubscriptionDetails).NotTo(BeNil())
			Expect(actual.Data.SubscriptionDetails).To(HaveKey("premium-team-sub"))
			Expect(actual.Data.SubscriptionDetails["premium-team-sub"].DisplayName).To(Equal("Premium Team"))
			Expect(actual.Data.SubscriptionDetails["premium-team-sub"].Models).To(ConsistOf("Granite 3 8B Instruct", "Flan T5 Small"))
			Expect(actual.Data.SubscriptionDetails).To(HaveKey("basic-team-sub"))
			Expect(actual.Data.SubscriptionDetails["basic-team-sub"].DisplayName).To(Equal("Basic Team"))
			Expect(actual.Data.SubscriptionDetails["basic-team-sub"].Models).To(ConsistOf("Flan T5 Small"))
		})
		It("returns 400 if the user ID is missing", func() {
			identity := &kubernetes.RequestIdentity{UserID: ""}
			searchRequest := models.APIKeySearchRequest{}
			actual, rs, err := setupApiTest[Envelope[*models.APIKeyListResponse, None]](
				http.MethodPost,
				"/api/v1/api-keys/search",
				Envelope[models.APIKeySearchRequest, None]{
					Data: searchRequest,
				},
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusBadRequest))
			Expect(actual.Data).To(BeNil())
		})
	})
	var _ = Describe("GetAPIKeyHandler", Ordered, func() {
		It("returns 200 and the API key", func() {
			identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
			actual, rs, err := setupApiTest[Envelope[*models.APIKey, None]](
				http.MethodGet,
				"/api/v1/api-keys/key_prod_backend_001",
				nil,
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusOK))
			Expect(actual.Data.ID).NotTo(BeEmpty())
			Expect(actual.Data.Name).To(Equal("production-backend"))
			Expect(actual.Data.Description).To(Equal("Production API key for backend service"))
			Expect(actual.Data.CreationDate).NotTo(BeZero())
			Expect(actual.Data.Status).To(Equal(models.APIKeyStatusActive))
		})

		It("returns 400 if API key ID is not provided", func() {
			identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
			req := httptest.NewRequest(http.MethodGet, "/api/v1/api-keys/", nil)

			ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
			req = req.WithContext(ctx)

			rr := httptest.NewRecorder()
			params := httprouter.Params{httprouter.Param{Key: "id", Value: ""}}

			GetAPIKeyHandler(nil, rr, req, params)

			Expect(rr.Code).To(Equal(http.StatusBadRequest))
		})
	})
	var _ = Describe("CreateAPIKeyHandler", Ordered, func() {
		It("returns 201 and the created API key", func() {
			identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
			apiKey := models.APIKeyCreateRequest{
				Name:         "new-api-key",
				Description:  "Newly created API key",
				ExpiresIn:    "90d",
				Subscription: "test-subscription",
			}
			actual, rs, err := setupApiTest[Envelope[*models.APIKeyCreateResponse, None]](
				http.MethodPost,
				"/api/v1/api-keys",
				Envelope[models.APIKeyCreateRequest, None]{
					Data: apiKey,
				},
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusCreated))
			Expect(actual.Data.Key).NotTo(BeEmpty())
			Expect(actual.Data.KeyPrefix).NotTo(BeEmpty())
			Expect(actual.Data.ID).NotTo(BeEmpty())
			Expect(actual.Data.Name).To(Equal("new-api-key"))
			Expect(actual.Data.CreatedAt).NotTo(BeZero())
		})
		It("returns a bad request error if the request is invalid", func() {
			identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
			req := httptest.NewRequest(http.MethodPost, "/api/v1/api-keys", nil)

			ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
			req = req.WithContext(ctx)

			rr := httptest.NewRecorder()

			CreateAPIKeyHandler(nil, rr, req, httprouter.Params{})

			Expect(rr.Code).To(Equal(http.StatusBadRequest))
		})
		It("returns 400 when name is empty", func() {
			identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
			actual, rs, err := setupApiTest[HTTPError](
				http.MethodPost,
				"/api/v1/api-keys",
				Envelope[models.APIKeyCreateRequest, None]{
					Data: models.APIKeyCreateRequest{Name: "", Subscription: "test-subscription"},
				},
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusBadRequest))
			Expect(actual.Error.Message).To(ContainSubstring("name is required"))
		})
		It("returns 400 when subscription is empty", func() {
			identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
			actual, rs, err := setupApiTest[HTTPError](
				http.MethodPost,
				"/api/v1/api-keys",
				Envelope[models.APIKeyCreateRequest, None]{
					Data: models.APIKeyCreateRequest{Name: "my-key", Subscription: ""},
				},
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusBadRequest))
			Expect(actual.Error.Message).To(ContainSubstring("subscription is required"))
		})
		It("returns 400 with the upstream message when expiration exceeds the maximum", func() {
			identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
			actual, rs, err := setupApiTest[HTTPError](
				http.MethodPost,
				"/api/v1/api-keys",
				Envelope[models.APIKeyCreateRequest, None]{
					Data: models.APIKeyCreateRequest{Name: "my-key", ExpiresIn: "trigger_expiration_exceeded", Subscription: "test-subscription"},
				},
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusBadRequest))
			Expect(actual.Error.Message).To(ContainSubstring("requested expiration (8760h0m0s) exceeds maximum allowed (90 days)"))
		})
	})
	var _ = Describe("RevokeAPIKeyHandler", Ordered, func() {
		It("returns 200 and the revoked API key", func() {
			identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
			actual, rs, err := setupApiTest[Envelope[*models.APIKey, None]](
				http.MethodDelete,
				"/api/v1/api-keys/key_prod_backend_001",
				nil,
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusOK))
			Expect(actual.Data.ID).NotTo(BeEmpty())
			Expect(actual.Data.Status).To(Equal(models.APIKeyStatusRevoked))
		})

		It("returns 400 if API key ID is not provided", func() {
			identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
			req := httptest.NewRequest(http.MethodDelete, "/api/v1/api-keys/", nil)

			ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
			req = req.WithContext(ctx)

			rr := httptest.NewRecorder()
			params := httprouter.Params{httprouter.Param{Key: "id", Value: ""}}

			RevokeAPIKeyHandler(nil, rr, req, params)

			Expect(rr.Code).To(Equal(http.StatusBadRequest))
		})
	})
	var _ = Describe("BulkRevokeAPIKeysHandler", Ordered, func() {
		It("returns 200 with revoke count", func() {
			identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
			bulkRequest := models.APIKeyBulkRevokeRequest{
				Username: "admin-user",
			}
			actual, rs, err := setupApiTest[Envelope[*models.APIKeyBulkRevokeResponse, None]](
				http.MethodPost,
				"/api/v1/api-keys/bulk-revoke",
				Envelope[models.APIKeyBulkRevokeRequest, None]{
					Data: bulkRequest,
				},
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusOK))
			Expect(actual.Data.RevokedCount).To(BeNumerically(">", 0))
			Expect(actual.Data.Message).NotTo(BeEmpty())
		})

		It("returns a bad request error if username is missing", func() {
			identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
			bulkRequest := models.APIKeyBulkRevokeRequest{
				Username: "",
			}
			req := httptest.NewRequest(http.MethodPost, "/api/v1/api-keys/bulk-revoke", nil)

			ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
			req = req.WithContext(ctx)

			rr := httptest.NewRecorder()

			_ = bulkRequest
			BulkRevokeAPIKeysHandler(nil, rr, req, httprouter.Params{})

			Expect(rr.Code).To(Equal(http.StatusBadRequest))
		})
	})

	var _ = Describe("ListSubscriptionsPassthroughHandler", Ordered, func() {
		It("returns 200 and a list of subscriptions from the maas-api passthrough", func() {
			identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
			actual, rs, err := setupApiTest[Envelope[[]models.SubscriptionListItem, None]](
				http.MethodGet,
				"/api/v1/subscriptions",
				nil,
				k8Factory,
				identity,
			)

			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusOK))
			Expect(actual.Data).NotTo(BeNil())
			Expect(len(actual.Data)).Should(BeNumerically(">", 0))

			first := actual.Data[0]
			Expect(first.SubscriptionIDHeader).NotTo(BeEmpty())
			Expect(first.SubscriptionDescription).NotTo(BeEmpty())
			Expect(first.ModelRefs).NotTo(BeEmpty())
			Expect(first.ModelRefs[0].DisplayName).To(Equal("Granite 3 8B Instruct"))
			Expect(first.ModelRefs[0].Description).To(Equal("Granite 3 8B Instruct is a large language model that is used for advanced tasks."))
			// The fake server returns all 75 keys regardless of the per-subscription filter,
			// so the BFF clamps the count to subscriptionKeyCountCap.
			Expect(first.KeyCount).To(Equal(int32(subscriptionKeyCountCap)))
		})

		It("returns 400 when no identity is provided", func() {
			_, rs, err := setupApiTest[Envelope[[]models.SubscriptionListItem, None]](
				http.MethodGet,
				"/api/v1/subscriptions",
				nil,
				k8Factory,
				nil,
			)

			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusBadRequest))
		})

		It("returns 200 with KeyCount 0 for all subscriptions when SearchAPIKeys fails", func() {
			// Fake server that returns subscriptions normally but fails on API key search,
			// exercising the non-fatal error branch in enrichSubscriptionsWithKeyCount.
			failSearchServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if r.Method == http.MethodPost && r.URL.Path == "/v1/api-keys/search" {
					w.WriteHeader(http.StatusInternalServerError)
					return
				}
				if r.Method == http.MethodGet && r.URL.Path == "/v1/subscriptions" {
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusOK)
					_, _ = w.Write([]byte(`[{"subscription_id_header":"test-sub","subscription_description":"Test Sub","model_refs":[]}]`))
					return
				}
				w.WriteHeader(http.StatusNotFound)
			}))
			defer failSearchServer.Close()

			envConfig := config.EnvConfig{
				AllowedOrigins:            []string{"*"},
				AuthMethod:                config.AuthMethodInternal,
				GatewayNamespace:          "openshift-ingress",
				GatewayName:               "maas-default-gateway",
				MockHTTPClient:            true,
				MaasApiUrl:                failSearchServer.URL,
				MaaSSubscriptionNamespace: "maas-system",
			}
			testLogger := slog.New(slog.NewTextHandler(io.Discard, nil))
			subsRepo := repositories.NewSubscriptionsRepository(testLogger, k8Factory, envConfig.MaaSSubscriptionNamespace)
			policiesRepo := repositories.NewPoliciesRepository(testLogger, k8Factory, envConfig.MaaSSubscriptionNamespace)
			modelRefsRepo := repositories.NewMaaSModelRefsRepository(testLogger, k8Factory)
			repos, err := repositories.NewRepositories(testLogger, k8Factory, envConfig, subsRepo, policiesRepo, modelRefsRepo)
			Expect(err).NotTo(HaveOccurred())

			app := &App{
				config:                  envConfig,
				kubernetesClientFactory: k8Factory,
				repositories:            repos,
				logger:                  testLogger,
			}

			identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
			req, err := http.NewRequest(http.MethodGet, "/api/v1/subscriptions", http.NoBody)
			Expect(err).NotTo(HaveOccurred())
			req.Header.Set(constants.KubeflowUserIDHeader, identity.UserID)
			req = req.WithContext(context.WithValue(req.Context(), constants.RequestIdentityKey, identity))

			rr := httptest.NewRecorder()
			app.Routes().ServeHTTP(rr, req)
			res := rr.Result()
			defer res.Body.Close()

			Expect(res.StatusCode).To(Equal(http.StatusOK))
			body, err := io.ReadAll(res.Body)
			Expect(err).NotTo(HaveOccurred())
			var actual Envelope[[]models.SubscriptionListItem, None]
			Expect(json.Unmarshal(body, &actual)).To(Succeed())
			Expect(actual.Data).NotTo(BeNil())
			Expect(len(actual.Data)).Should(BeNumerically(">", 0))
			for _, sub := range actual.Data {
				Expect(sub.KeyCount).To(Equal(int32(0)), "KeyCount should remain 0 when SearchAPIKeys fails")
			}
		})
	})
})
