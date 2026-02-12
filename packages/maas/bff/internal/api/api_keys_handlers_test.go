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
	var _ = Describe("ListAPIKeysHandler", Ordered, func() {
		It("returns 200 and a list of API keys", func() {
			identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
			actual, rs, err := setupApiTest[Envelope[[]models.APIKeyMetadata, None]](
				http.MethodGet,
				"/api/v1/api-keys",
				nil,
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusOK))
			Expect(actual.Data).NotTo(BeNil())
			Expect(len(actual.Data)).Should(BeNumerically(">", 0))
		})
		It("returns 400 if the user ID is missing", func() {
			identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
			identity.UserID = "" //No user ID to force an error

			actual, rs, err := setupApiTest[Envelope[[]models.APIKeyMetadata, None]](
				http.MethodGet,
				"/api/v1/api-keys",
				nil,
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
			actual, rs, err := setupApiTest[Envelope[*models.APIKeyMetadata, None]](
				http.MethodGet,
				"/api/v1/api-key/production-backend",
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
			Expect(actual.Data.ExpirationDate).NotTo(BeZero())
			Expect(actual.Data.Status).To(Equal(models.APIKeyStatusActive))
		})

		It("returns 400 if API key ID is not provided", func() {
			identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
			req := httptest.NewRequest(http.MethodGet, "/api/v1/api-key/", nil)

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
			apiKey := models.APIKeyRequest{
				Name:        "new-api-key",
				Description: "Newly created API key",
			}
			actual, rs, err := setupApiTest[Envelope[*models.APIKeyResponse, None]](
				http.MethodPost,
				"/api/v1/api-key",
				Envelope[models.APIKeyRequest, None]{
					Data: apiKey,
				},
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusCreated))
			Expect(actual.Data.Token).NotTo(BeEmpty())
			Expect(actual.Data.Expiration).To(Equal("4h")) //4h is default
			Expect(actual.Data.ExpiresAt).NotTo(BeZero())
			Expect(actual.Data.JTI).NotTo(BeEmpty())
			Expect(actual.Data.Name).To(Equal("new-api-key"))
			Expect(actual.Data.Description).To(Equal("Newly created API key"))
		})
		It("returns a bad request error if the request is invalid", func() {
			identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
			req := httptest.NewRequest(http.MethodPost, "/api/v1/api-key/", nil)

			ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
			req = req.WithContext(ctx)

			rr := httptest.NewRecorder()

			CreateAPIKeyHandler(nil, rr, req, httprouter.Params{}) //empty params to force a bad request

			Expect(rr.Code).To(Equal(http.StatusBadRequest))
		})
	})
	var _ = Describe("DeleteAllAPIKeysHandler", Ordered, func() {
		It("returns 200 and deletes all API keys", func() {
			identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
			actual, rs, err := setupApiTest[Envelope[None, None]](
				http.MethodDelete,
				"/api/v1/api-keys",
				nil,
				k8Factory,
				identity,
			)
			Expect(err).NotTo(HaveOccurred())
			Expect(rs.StatusCode).To(Equal(http.StatusOK))
			Expect(actual.Data).To(BeNil())
		})
	})
})
