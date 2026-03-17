package api

import (
	"context"
	"net/http"
	"net/http/httptest"

	"github.com/julienschmidt/httprouter"
	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"

	"github.com/opendatahub-io/maas-library/bff/internal/constants"
	"github.com/opendatahub-io/maas-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
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
				Name:        "new-api-key",
				Description: "Newly created API key",
				ExpiresIn:   "90d",
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
})
