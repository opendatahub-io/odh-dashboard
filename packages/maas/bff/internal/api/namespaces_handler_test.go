package api

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/opendatahub-io/maas-library/bff/internal/config"
	"github.com/opendatahub-io/maas-library/bff/internal/constants"
	"github.com/opendatahub-io/maas-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/maas-library/bff/internal/integrations/kubernetes/k8mocks"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
	"github.com/opendatahub-io/maas-library/bff/internal/repositories"
)

var _ = Describe("TestNamespacesHandler", func() {
	Context("when running in dev mode with k8 service account client", Ordered, func() {
		var testApp App

		BeforeAll(func() {
			By("setting up the test app in dev mode")

			testApp = App{
				config:                  config.EnvConfig{DevMode: true},
				kubernetesClientFactory: k8Factory,
				repositories:            repositories.NewRepositories(logger, k8Factory, envConfig),
				logger:                  logger,
			}
		})

		It("should return only dora-namespace for doraNonAdmin@example.com", func() {
			By("creating the HTTP request with the userid header")
			req, err := http.NewRequest(http.MethodGet, NamespacePath, nil)

			reqIdentity := &kubernetes.RequestIdentity{
				UserID: DoraNonAdminUser,
			}
			ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, reqIdentity)
			req = req.WithContext(ctx)
			Expect(err).NotTo(HaveOccurred())
			rr := httptest.NewRecorder()

			By("calling the GetNamespacesHandler")
			testApp.GetNamespacesHandler(rr, req, nil)
			rs := rr.Result()
			defer rs.Body.Close()
			body, err := io.ReadAll(rs.Body)
			Expect(err).NotTo(HaveOccurred())

			By("unmarshalling the response")
			var actual NamespacesEnvelope
			err = json.Unmarshal(body, &actual)
			Expect(err).NotTo(HaveOccurred())
			Expect(rr.Code).To(Equal(http.StatusOK))

			By("validating the response contains only dora-namespace")
			doraDisplayName := "dora-namespace-maas"
			expected := []models.NamespaceModel{{Name: "dora-namespace-maas", DisplayName: &doraDisplayName}}
			Expect(actual.Data).To(ConsistOf(expected))
		})

		It("should return all namespaces for user@example.com", func() {
			By("creating the HTTP request with the userid header")
			req, err := http.NewRequest(http.MethodGet, NamespacePath, nil)
			reqIdentity := &kubernetes.RequestIdentity{
				UserID: UserIDHeaderValue,
			}
			ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, reqIdentity)
			req = req.WithContext(ctx)
			Expect(err).NotTo(HaveOccurred())
			req.Header.Set("userid", "user@example.com")
			rr := httptest.NewRecorder()

			By("calling the GetNamespacesHandler")
			testApp.GetNamespacesHandler(rr, req, nil)
			rs := rr.Result()
			defer rs.Body.Close()
			body, err := io.ReadAll(rs.Body)
			Expect(err).NotTo(HaveOccurred())

			By("unmarshalling the response")
			var actual NamespacesEnvelope
			err = json.Unmarshal(body, &actual)
			Expect(err).NotTo(HaveOccurred())
			Expect(rr.Code).To(Equal(http.StatusOK))

			By("validating the response contains all namespaces")
			maasDisplayName := "default-maas"
			doraDisplayName := "dora-namespace-maas"
			expected := []models.NamespaceModel{
				{Name: "default-maas", DisplayName: &maasDisplayName},
				{Name: "dora-namespace-maas", DisplayName: &doraDisplayName},
			}
			Expect(actual.Data).To(ContainElements(expected))
		})

		It("should return no namespaces for non-existent user", func() {
			By("creating the HTTP request with a non-existent userid")
			req, err := http.NewRequest(http.MethodGet, NamespacePath, nil)
			reqIdentity := &kubernetes.RequestIdentity{
				UserID: "nonexistent@example.com",
			}
			ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, reqIdentity)
			req = req.WithContext(ctx)
			Expect(err).NotTo(HaveOccurred())
			rr := httptest.NewRecorder()

			By("calling the GetNamespacesHandler")
			testApp.GetNamespacesHandler(rr, req, nil)
			rs := rr.Result()
			defer rs.Body.Close()
			body, err := io.ReadAll(rs.Body)
			Expect(err).NotTo(HaveOccurred())

			By("unmarshalling the response")
			var actual NamespacesEnvelope
			err = json.Unmarshal(body, &actual)
			Expect(err).NotTo(HaveOccurred())
			Expect(rr.Code).To(Equal(http.StatusOK))

			By("validating the response contains no namespaces")
			Expect(actual.Data).To(BeEmpty())
		})
	})

	Context("when running in dev mode with k8 token client", Ordered, func() {
		var testApp App

		BeforeAll(func() {
			By("setting up the test app in dev mode")
			kubernetesMockedTokenClientFactory, err := k8mocks.NewTokenClientFactory(clientset, restConfig, logger)
			Expect(err).NotTo(HaveOccurred())
			testApp = App{
				config:                  config.EnvConfig{DevMode: true},
				kubernetesClientFactory: kubernetesMockedTokenClientFactory,
				repositories:            repositories.NewRepositories(logger, kubernetesMockedTokenClientFactory, envConfig),
				logger:                  logger,
			}
		})

		It("should return namespaces for user@example.com - with token", func() {
			By("creating the HTTP request with the userid header")
			req, err := http.NewRequest(http.MethodGet, NamespacePath, nil)

			reqIdentity := &kubernetes.RequestIdentity{
				Token: k8mocks.DefaultTestUsers[0].Token,
			}
			ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, reqIdentity)
			req = req.WithContext(ctx)
			Expect(err).NotTo(HaveOccurred())
			rr := httptest.NewRecorder()

			By("calling the GetNamespacesHandler")
			testApp.GetNamespacesHandler(rr, req, nil)
			rs := rr.Result()
			defer rs.Body.Close()
			body, err := io.ReadAll(rs.Body)
			Expect(err).NotTo(HaveOccurred())

			By("unmarshalling the response")
			var actual NamespacesEnvelope
			err = json.Unmarshal(body, &actual)
			Expect(err).NotTo(HaveOccurred())
			Expect(rr.Code).To(Equal(http.StatusOK))

			By("validating the response contains namespaces")
			Expect(actual.Data).ToNot(BeEmpty())
		})

		It("should return no namespaces for non-authorized existent user", func() {
			By("creating the HTTP request with a non-authorized user")
			req, err := http.NewRequest(http.MethodGet, NamespacePath, nil)
			reqIdentity := &kubernetes.RequestIdentity{
				Token: k8mocks.DefaultTestUsers[1].Token,
			}
			ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, reqIdentity)
			req = req.WithContext(ctx)
			Expect(err).NotTo(HaveOccurred())
			rr := httptest.NewRecorder()

			By("calling the GetNamespacesHandler")
			testApp.GetNamespacesHandler(rr, req, nil)
			rs := rr.Result()
			defer rs.Body.Close()
			body, err := io.ReadAll(rs.Body)
			Expect(err).NotTo(HaveOccurred())

			By("unmarshalling the response")
			var actual NamespacesEnvelope
			err = json.Unmarshal(body, &actual)
			Expect(err).NotTo(HaveOccurred())
			Expect(rr.Code).To(Equal(http.StatusInternalServerError))

		})
	})
})
